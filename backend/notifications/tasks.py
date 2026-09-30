from datetime import timedelta

from celery import shared_task
from django.utils import timezone


@shared_task
def notify_expiring_saved_offers():
    """Section 22/31 — tell a customer when something they saved is about to expire."""
    from engagement.models import FavoriteOffer

    from .models import Notification

    soon = timezone.now() + timedelta(hours=6)
    favorites = FavoriteOffer.objects.filter(
        offer__status="active",
        offer__end_time__isnull=False,
        offer__end_time__lte=soon,
        offer__end_time__gte=timezone.now(),
    ).select_related("offer", "user")

    created = 0
    for fav in favorites:
        if not fav.user.customer_profile.notify_saved_offer_expiry:
            continue
        _, was_created = Notification.objects.get_or_create(
            user=fav.user,
            kind=Notification.Kind.SAVED_OFFER_EXPIRING,
            offer=fav.offer,
            defaults={
                "title": f"'{fav.offer.title}' is expiring soon",
                "body": "One of your saved offers ends in a few hours.",
                "business": fav.offer.business,
            },
        )
        created += int(was_created)
    return f"notified {created} customers"


@shared_task
def notify_followed_shop_new_offer(offer_id):
    from businesses.models import Business
    from engagement.models import FollowBusiness

    from .models import Notification

    followers = FollowBusiness.objects.filter(business_id=Business.objects.get(offers__id=offer_id).id)
    from offers.models import Offer

    offer = Offer.objects.get(pk=offer_id)
    for follow in followers.select_related("user"):
        if follow.user.customer_profile.notify_followed_shops:
            Notification.objects.create(
                user=follow.user,
                kind=Notification.Kind.FOLLOWED_SHOP_OFFER,
                title=f"{offer.business.name} just posted a new offer!",
                body=offer.title,
                offer=offer,
                business=offer.business,
            )
