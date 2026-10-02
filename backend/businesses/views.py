from django.conf import settings
from django.db.models import F, Q
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.geo import bounding_box, distance_expression, parse_geo_params
from core.permissions import HasCurrentShopkeeperLegalAcceptance, IsBusinessOwner

from .models import Business, BusinessVerification
from .serializers import (
    BusinessDetailSerializer,
    BusinessListSerializer,
    BusinessVerificationSerializer,
)


class BusinessViewSet(viewsets.ModelViewSet):
    """
    Public read (guests browse shop profiles with no login — section 6),
    owner-only write. Supports ?lat=&lng=&radius_km= for nearby discovery
    and ?city=&category=&search=.
    """

    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsBusinessOwner, HasCurrentShopkeeperLegalAcceptance]

    def get_serializer_class(self):
        if self.action == "list":
            return BusinessListSerializer
        # retrieve/update/partial_update/create all need the full shape —
        # otherwise a PATCH (e.g. saving opening_hours) echoes back the slim
        # card shape and silently drops the field the caller just set.
        return BusinessDetailSerializer

    def get_queryset(self):
        qs = Business.objects.filter(is_active=True).select_related("category")
        if self.action in ("update", "partial_update", "destroy", "my_business"):
            qs = Business.objects.filter(owner=self.request.user)

        params = self.request.query_params
        if params.get("city"):
            qs = qs.filter(city__iexact=params["city"])
        if params.get("category"):
            qs = qs.filter(category_id=params["category"])
        if params.get("search"):
            qs = qs.filter(name__icontains=params["search"])
        if params.get("verified_only") == "true":
            qs = qs.filter(verification_status="verified")

        return qs

    @method_decorator(cache_page(settings.PUBLIC_API_CACHE_SECONDS))
    @method_decorator(vary_on_headers("Authorization", "Cookie"))
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        lat, lng, radius = parse_geo_params(request.query_params, default_radius=10)
        if lat is not None:
            if radius is not None:
                lat_min, lat_max, lng_min, lng_max = bounding_box(lat, lng, radius)
                queryset = queryset.filter(
                    (
                        Q(latitude__gte=lat_min, latitude__lte=lat_max,
                          longitude__gte=lng_min, longitude__lte=lng_max)
                    )
                    | Q(latitude__isnull=True)
                    | Q(longitude__isnull=True)
                )
            queryset = queryset.annotate(distance_km=distance_expression(lat, lng, "latitude", "longitude"))
            if radius is not None:
                queryset = queryset.filter(Q(distance_km__lte=radius) | Q(distance_km__isnull=True))
            queryset = queryset.order_by(F("distance_km").asc(nulls_last=True), "-id")

        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page if page is not None else queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def mine(self, request):
        """Shopkeeper dashboard: 'my businesses'."""
        qs = Business.objects.filter(owner=request.user)
        serializer = BusinessDetailSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated, HasCurrentShopkeeperLegalAcceptance],
    )
    def submit_verification(self, request, pk=None):
        business = self.get_object()
        if business.owner_id != request.user.id:
            return Response({"detail": "Not your business."}, status=status.HTTP_403_FORBIDDEN)
        payload = request.data.copy()
        payload["business"] = business.id
        existing = BusinessVerification.objects.filter(business=business).first()
        serializer = BusinessVerificationSerializer(instance=existing, data=payload)
        serializer.is_valid(raise_exception=True)
        verification = serializer.save(status="pending", admin_note="", decided_at=None, decided_by=None)
        business.verification_status = "pending"
        business.save(update_fields=["verification_status"])
        return Response(
            BusinessVerificationSerializer(verification).data,
            status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED,
        )
