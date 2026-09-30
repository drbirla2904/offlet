from datetime import timedelta

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from businesses.models import Business
from core.choices import InteractionType, OfferStatus
from engagement.models import Review
from offers.models import Offer

from .models import OfferInteraction, OfferView


class ShopkeeperDashboardView(APIView):
    """Section 27 — the shopkeeper dashboard stats + section 41 event counts,
    scoped to businesses owned by the requesting user (optionally one business
    via ?business=<id>)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        businesses = Business.objects.filter(owner=request.user)
        business_id = request.query_params.get("business")
        if business_id:
            businesses = businesses.filter(id=business_id)

        offers = Offer.objects.filter(business__in=businesses)
        offer_counts = {
            "active": offers.filter(status=OfferStatus.ACTIVE).count(),
            "total": offers.count(),
            "expired": offers.filter(status=OfferStatus.EXPIRED).count(),
            "paused": offers.filter(status=OfferStatus.PAUSED).count(),
            "scheduled": offers.filter(status=OfferStatus.SCHEDULED).count(),
            "sold_out": offers.filter(status=OfferStatus.SOLD_OUT).count(),
            "draft": offers.filter(status=OfferStatus.DRAFT).count(),
        }

        views_qs = OfferView.objects.filter(offer__business__in=businesses)
        interactions_qs = OfferInteraction.objects.filter(business__in=businesses)

        interaction_counts = {
            row["interaction_type"]: row["count"]
            for row in interactions_qs.values("interaction_type").annotate(count=Count("id"))
        }

        since = timezone.now() - timedelta(days=30)
        daily_views = list(
            views_qs.filter(created_at__gte=since)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )

        top_offers = (
            offers.order_by("-view_count")[:5]
            .values("id", "title", "view_count", "favorite_count", "status")
        )

        return Response(
            {
                "offer_counts": offer_counts,
                "total_views": views_qs.count(),
                "calls": interaction_counts.get(InteractionType.CALL, 0),
                "whatsapp_clicks": interaction_counts.get(InteractionType.WHATSAPP, 0),
                "direction_requests": interaction_counts.get(InteractionType.DIRECTIONS, 0),
                "favorites": interaction_counts.get(InteractionType.FAVORITE, 0),
                "shares": interaction_counts.get(InteractionType.SHARE, 0),
                "chats_started": interaction_counts.get(InteractionType.CHAT, 0),
                "reports": interaction_counts.get(InteractionType.REPORT, 0),
                "reviews": Review.objects.filter(business__in=businesses, is_hidden=False).count(),
                "daily_views": daily_views,
                "best_performing_offers": list(top_offers),
            }
        )
