from django.conf import settings
from django.db import models
from django.db.models import F, Q, Prefetch, TextField
from django.db.models.functions import Cast
from django.utils import timezone
from django.utils.decorators import method_decorator
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers

from analytics.models import OfferInteraction, OfferView
from catalog.models import ProductImage
from core.choices import OfferTag
from core.geo import bounding_box, distance_expression, parse_geo_params
from core.permissions import HasCurrentShopkeeperLegalAcceptance, IsBusinessOwner

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

    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsBusinessOwner, HasCurrentShopkeeperLegalAcceptance]
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
            Prefetch(
                "product__images",
                queryset=ProductImage.objects.order_by("-is_primary", "order", "id"),
                to_attr="prefetched_images",
            )
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

        search = params.get("search", "").strip()
        if search:
            qs = qs.alias(searchable_tags=Cast("tags", TextField()))
            for term in search.split():
                term_filter = (
                    Q(title__icontains=term)
                    | Q(custom_description__icontains=term)
                    | Q(product__name__icontains=term)
                    | Q(product__brand__icontains=term)
                    | Q(product__description__icontains=term)
                    | Q(product__category__name__icontains=term)
                    | Q(business__name__icontains=term)
                )
                normalized_term = term.casefold().replace("_", " ")
                matching_tags = [
                    value
                    for value, label in OfferTag.CHOICES
                    if term.casefold() in value.casefold()
                    or normalized_term in label.casefold()
                ]
                for tag in matching_tags:
                    term_filter |= Q(searchable_tags__icontains=f'"{tag}"')
                qs = qs.filter(term_filter)
        return qs

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        return queryset

    @method_decorator(cache_page(settings.PUBLIC_API_CACHE_SECONDS))
    @method_decorator(vary_on_headers("Authorization", "Cookie"))
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        lat, lng, radius = parse_geo_params(request.query_params)
        ordering = request.query_params.get("ordering", "-created_at")
        if lat is not None:
            if radius is not None:
                lat_min, lat_max, lng_min, lng_max = bounding_box(lat, lng, radius)
                queryset = queryset.filter(
                    (
                        Q(
                            business__latitude__gte=lat_min,
                            business__latitude__lte=lat_max,
                            business__longitude__gte=lng_min,
                            business__longitude__lte=lng_max,
                        )
                    )
                    | Q(business__latitude__isnull=True)
                    | Q(business__longitude__isnull=True)
                )
            queryset = queryset.annotate(
                distance_km=distance_expression(lat, lng, "business__latitude", "business__longitude")
            )
            if radius is not None:
                queryset = queryset.filter(Q(distance_km__lte=radius) | Q(distance_km__isnull=True))

        order_fields = {
            "-created_at": ("-created_at", "-id"),
            "-discount": ("-discount_percentage", "-id"),
            "price": (F("offer_price").asc(nulls_last=True), "id"),
            "-price": (F("offer_price").desc(nulls_first=True), "-id"),
            "expiring_soon": (F("end_time").asc(nulls_last=True), "-id"),
            "-popular": ((F("view_count") + F("favorite_count") * 3).desc(), "-id"),
        }
        if ordering == "distance" and lat is not None:
            queryset = queryset.order_by(F("distance_km").asc(nulls_last=True), "-id")
        elif ordering in order_fields:
            queryset = queryset.order_by(*order_fields[ordering])

        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page if page is not None else queryset, many=True)
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

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated, HasCurrentShopkeeperLegalAcceptance],
    )
    def publish(self, request, pk=None):
        offer = self._owned_offer(request, pk)
        offer.publish()
        return Response(OfferDetailSerializer(offer, context={"request": request}).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def turn_off(self, request, pk=None):
        offer = self._owned_offer(request, pk)
        offer.pause()
        return Response(OfferDetailSerializer(offer, context={"request": request}).data)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated, HasCurrentShopkeeperLegalAcceptance],
    )
    def turn_on(self, request, pk=None):
        offer = self._owned_offer(request, pk)
        offer.resume()
        return Response(OfferDetailSerializer(offer, context={"request": request}).data)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated, HasCurrentShopkeeperLegalAcceptance],
    )
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
        Offer.objects.filter(pk=offer.pk).update(view_count=F("view_count") + 1)
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
