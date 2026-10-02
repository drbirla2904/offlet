import django_filters
from django.db.models import Q, TextField
from django.db.models.functions import Cast

from core.choices import OfferTag

from .models import Offer


class OfferFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="offer_price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="offer_price", lookup_expr="lte")
    min_discount = django_filters.NumberFilter(field_name="discount_percentage", lookup_expr="gte")
    category = django_filters.NumberFilter(field_name="product__category_id")
    business = django_filters.NumberFilter(field_name="business_id")
    city = django_filters.CharFilter(field_name="business__city", lookup_expr="iexact")
    offer_type = django_filters.CharFilter(field_name="offer_type")
    tag = django_filters.CharFilter(method="filter_tag")
    verified_only = django_filters.BooleanFilter(method="filter_verified_only")
    expiring_soon = django_filters.BooleanFilter(method="filter_expiring_soon")
    is_featured = django_filters.BooleanFilter(field_name="is_featured")
    is_trending = django_filters.BooleanFilter(field_name="is_trending")
    is_sponsored = django_filters.BooleanFilter(field_name="is_sponsored")
    promoted = django_filters.BooleanFilter(method="filter_promoted")

    class Meta:
        model = Offer
        fields = ["category", "business", "city", "offer_type"]

    def filter_tag(self, queryset, name, value):
        value = value.strip().casefold()
        normalized_label = value.replace("_", " ")
        tag_values = [
            tag
            for tag, label in OfferTag.CHOICES
            if value == tag.casefold() or normalized_label == label.casefold()
        ]
        if not tag_values:
            return queryset.none()

        queryset = queryset.alias(searchable_tags=Cast("tags", TextField()))
        tag_filter = Q()
        for tag in tag_values:
            tag_filter |= Q(searchable_tags__icontains=f'"{tag}"')
        return queryset.filter(tag_filter)

    def filter_promoted(self, queryset, name, value):
        """Any of Featured / Trending / Sponsored — used for the home page's
        hero carousel (section 34: these are admin-curated highlights)."""
        from django.db.models import Q

        if value:
            return queryset.filter(Q(is_featured=True) | Q(is_trending=True) | Q(is_sponsored=True))
        return queryset

    def filter_verified_only(self, queryset, name, value):
        if value:
            return queryset.filter(business__verification_status="verified")
        return queryset

    def filter_expiring_soon(self, queryset, name, value):
        from datetime import timedelta

        from django.utils import timezone

        if value:
            return queryset.filter(end_time__isnull=False, end_time__lte=timezone.now() + timedelta(hours=24))
        return queryset
