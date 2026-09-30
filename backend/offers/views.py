from django.db import models
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from analytics.models import OfferInteraction, OfferView
from core.geo import bounding_box, haversine_km
from core.permissions import IsBusinessOwner

from .filters import OfferFilter
from .models import Offer
from .serializers import OfferDetailSerializer, OfferListSerializer, OfferWriteSerializer

VALID_GUEST_INTERACTIONS = {"call", "whatsapp", "directions", "share"}


class OfferViewSet(viewsets.ModelViewSet):
    """
    Guests get full read access to ACTIVE, in-window offers with no login
    (sections 2 & 38). Shopkeepers manage their own offers (any status) by
    passing ?mine=true, which requires auth and is scoped to their businesses.
    """

    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsBusinessOwner]
    filterset_class = OfferFilter
    search_fields = ["title", "product__name", "product__brand", "business__name"]

    def get_serializer_class(self):
        return OfferDetailSerializer if self.action == "retrieve" else OfferListSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        user = self.request.user
        if user.is_authenticated:
            ctx["favorited_offer_ids"] = set(
                Offer.objects.filter(favorited_by__user=user).values_list("id", flat=True)
            )
        return ctx

    def get_queryset(self):
        base = Offer.objects.select_related("business", "product", "product__category").prefetch_related(
            "product__images"
        )
        params = self.request.query_params
        user = self.request.user

        if self.action == "list":
            if params.get("mine") == "true":
                if not user.is_authenticated:
                    raise PermissionDenied("Login required to view your own offers.")
                qs = base.filter(business__owner=user)
                status_param = params.get("status")
                if status_param:
                    qs = qs.filter(status=status_param)
            else:
                qs = base.visible_to_customers()
        else:
            # Detail-level actions (retrieve/update/publish/turn_on/turn_off/
            # duplicate/log_view/interact): a guest or another shopkeeper can
            # only reach a live offer; the owning shopkeeper can reach any of
            # their own offers regardless of status (drafts included).
            if user.is_authenticated:
                qs = base.filter(models.Q(business__owner=user) | models.Q(pk__in=base.visible_to_customers()))
            else:
                qs = base.visible_to_customers()

        search = params.get("search")
        if search:
            from django.db.models import Q

            qs = qs.filter(
                Q(title__icontains=search)
                | Q(product__name__icontains=search)
                | Q(product__brand__icontains=search)
                | Q(business__name__icontains=search)
            )
        return qs

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        offers = list(queryset)

        lat, lng = request.query_params.get("lat"), request.query_params.get("lng")
        if lat and lng:
            lat, lng = float(lat), float(lng)
            for o in offers:
                o.distance_km = haversine_km(lat, lng, o.business.latitude, o.business.longitude)
            radius = request.query_params.get("radius_km")
            if radius:
                radius = float(radius)
                offers = [o for o in offers if o.distance_km is None or o.distance_km <= radius]
        else:
            for o in offers:
                o.distance_km = None

        ordering = request.query_params.get("ordering", "-created_at")
        key_funcs = {
            "distance": lambda o: (o.distance_km is None, o.distance_km or 0),
            "-discount": lambda o: -o.discount_percentage,
            "price": lambda o: (o.offer_price is None, o.offer_price or 0),
            "-price": lambda o: -(o.offer_price or 0),
            "-created_at": lambda o: o.created_at,
            "expiring_soon": lambda o: (o.end_time is None, o.end_time),
            "-popular": lambda o: -(o.view_count + o.favorite_count * 3),
        }
        if ordering in key_funcs:
            reverse = ordering in ("-created_at",)
            offers.sort(key=key_funcs[ordering], reverse=reverse)

        page = self.paginate_queryset(offers)
        serializer = self.get_serializer(page or offers, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    def perform_create(self, serializer):
        write_serializer = OfferWriteSerializer(data=self.request.data, context={"request": self.request})
        write_serializer.is_valid(raise_exception=True)
        write_serializer.save()

    def create(self, request, *args, **kwargs):
        serializer = OfferWriteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        offer = serializer.save()
        return Response(OfferDetailSerializer(offer, context={"request": request}).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = OfferWriteSerializer(instance, data=request.data, partial=partial, context={"request": request})
        serializer.is_valid(raise_exception=True)
        offer = serializer.save()
        return Response(OfferDetailSerializer(offer, context={"request": request}).data)

    # ---- ON/OFF lifecycle actions (section 9 & 28) ------------------------
    def _owned_offer(self, request, pk):
        offer = self.get_object()
        if offer.business.owner_id != request.user.id and not request.user.is_staff:
            raise PermissionDenied("You do not own this offer.")
        return offer

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def publish(self, request, pk=None):
        offer = self._owned_offer(request, pk)
        offer.publish()
        return Response(OfferDetailSerializer(offer, context={"request": request}).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def turn_off(self, request, pk=None):
        offer = self._owned_offer(request, pk)
        offer.pause()
        return Response(OfferDetailSerializer(offer, context={"request": request}).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def turn_on(self, request, pk=None):
        offer = self._owned_offer(request, pk)
        offer.resume()
        return Response(OfferDetailSerializer(offer, context={"request": request}).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def duplicate(self, request, pk=None):
        offer = self._owned_offer(request, pk)
        clone = offer.duplicate()
        return Response(OfferDetailSerializer(clone, context={"request": request}).data, status=status.HTTP_201_CREATED)

    # ---- guest-visible analytics logging -----------------------------
    @action(detail=True, methods=["post"], permission_classes=[permissions.AllowAny])
    def log_view(self, request, pk=None):
        offer = self.get_object()
        OfferView.objects.create(
            offer=offer,
            user=request.user if request.user.is_authenticated else None,
            guest_id=request.data.get("guest_id") or None,
        )
        Offer.objects.filter(pk=offer.pk).update(view_count=offer.view_count + 1)
        return Response({"status": "logged"})

    @action(detail=True, methods=["post"], permission_classes=[permissions.AllowAny])
    def interact(self, request, pk=None):
        """Call / WhatsApp / Directions / Share stay guest-friendly (section 4);
        anything else (report, chat) must come from an authenticated user."""
        offer = self.get_object()
        interaction_type = request.data.get("type")
        if interaction_type not in VALID_GUEST_INTERACTIONS and not request.user.is_authenticated:
            raise ValidationError({"code": "login_required", "message": "Login required for this action."})
        OfferInteraction.objects.create(
            offer=offer,
            business=offer.business,
            user=request.user if request.user.is_authenticated else None,
            guest_id=request.data.get("guest_id") or None,
            interaction_type=interaction_type,
        )
        if interaction_type == "share":
            Offer.objects.filter(pk=offer.pk).update(share_count=offer.share_count + 1)
        return Response({"status": "logged"})
