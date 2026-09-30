from django.db.models import Avg, Count
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from analytics.models import OfferInteraction
from businesses.models import Business
from core.choices import InteractionType
from offers.models import Offer

from .models import FavoriteOffer, FollowBusiness, OfferReport, Review
from .serializers import (
    FavoriteOfferSerializer,
    FollowBusinessSerializer,
    OfferReportSerializer,
    ReviewSerializer,
)


class FavoriteOfferViewSet(viewsets.ModelViewSet):
    """Save an offer — login required (section 3)."""

    serializer_class = FavoriteOfferSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FavoriteOffer.objects.filter(user=self.request.user).select_related("offer")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        OfferInteraction.objects.create(
            offer=serializer.instance.offer,
            business=serializer.instance.offer.business,
            user=self.request.user,
            interaction_type=InteractionType.FAVORITE,
        )
        offer = serializer.instance.offer
        offer.favorite_count = offer.favorited_by.count()
        offer.save(update_fields=["favorite_count"])

    def perform_destroy(self, instance):
        offer = instance.offer
        instance.delete()
        offer.favorite_count = offer.favorited_by.count()
        offer.save(update_fields=["favorite_count"])

    @action(detail=False, methods=["delete"], url_path="by-offer/(?P<offer_id>[^/.]+)")
    def by_offer(self, request, offer_id=None):
        """Unfavorite by offer id — offer list/detail views only carry a
        boolean `is_favorited`, not the FavoriteOffer record id, so this is
        the endpoint the frontend actually calls to un-save from a card."""
        deleted, _ = FavoriteOffer.objects.filter(user=request.user, offer_id=offer_id).delete()
        if deleted:
            offer = Offer.objects.filter(pk=offer_id).first()
            if offer:
                offer.favorite_count = offer.favorited_by.count()
                offer.save(update_fields=["favorite_count"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class FollowBusinessViewSet(viewsets.ModelViewSet):
    """Follow a shop — login required (section 3 & 23)."""

    serializer_class = FollowBusinessSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FollowBusiness.objects.filter(user=self.request.user).select_related("business")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        business = serializer.instance.business
        business.follower_count = business.followers.count()
        business.save(update_fields=["follower_count"])

    def perform_destroy(self, instance):
        business = instance.business
        instance.delete()
        business.follower_count = business.followers.count()
        business.save(update_fields=["follower_count"])

    @action(detail=False, methods=["delete"], url_path="by-business/(?P<business_id>[^/.]+)")
    def by_business(self, request, business_id=None):
        """Unfollow by business id — mirrors FavoriteOfferViewSet.by_offer,
        since business detail/list shapes only carry `is_following`."""
        deleted, _ = FollowBusiness.objects.filter(user=request.user, business_id=business_id).delete()
        if deleted:
            business = Business.objects.filter(pk=business_id).first()
            if business:
                business.follower_count = business.followers.count()
                business.save(update_fields=["follower_count"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReviewViewSet(viewsets.ModelViewSet):
    """Guests can read reviews (section 25); writing requires login."""

    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Review.objects.filter(is_hidden=False).select_related("user")
        business_id = self.request.query_params.get("business")
        if business_id:
            qs = qs.filter(business_id=business_id)
        return qs

    def perform_create(self, serializer):
        review = serializer.save(user=self.request.user)
        agg = Review.objects.filter(business=review.business, is_hidden=False).aggregate(
            avg=Avg("rating"), count=Count("id")
        )
        Business.objects.filter(pk=review.business_id).update(
            rating_average=round(agg["avg"] or 0, 1), rating_count=agg["count"]
        )


class OfferReportViewSet(viewsets.ModelViewSet):
    """Report an offer — login required (section 3 & 26)."""

    serializer_class = OfferReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return OfferReport.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        report = serializer.save(user=self.request.user)
        OfferInteraction.objects.create(
            offer=report.offer,
            business=report.offer.business,
            user=self.request.user,
            interaction_type=InteractionType.REPORT,
        )
