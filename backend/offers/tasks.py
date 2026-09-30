from celery import shared_task
from django.utils import timezone

from core.choices import OfferStatus


@shared_task
def activate_scheduled_offers():
    from .models import Offer

    now = timezone.now()
    qs = Offer.objects.filter(status=OfferStatus.SCHEDULED, start_time__lte=now)
    count = qs.update(status=OfferStatus.ACTIVE)
    return f"activated {count} offers"


@shared_task
def expire_ended_offers():
    from .models import Offer

    now = timezone.now()
    qs = Offer.objects.filter(status__in=[OfferStatus.ACTIVE, OfferStatus.PAUSED, OfferStatus.SOLD_OUT], end_time__lte=now)
    count = qs.update(status=OfferStatus.EXPIRED)
    return f"expired {count} offers"


@shared_task
def notify_low_stock(threshold=3):
    from notifications.models import Notification

    from .models import Offer

    qs = Offer.objects.filter(status=OfferStatus.ACTIVE, total_stock__isnull=False)
    created = 0
    for offer in qs:
        if offer.available_stock is not None and 0 < offer.available_stock <= threshold:
            Notification.objects.get_or_create(
                user=offer.business.owner,
                kind=Notification.Kind.LOW_STOCK,
                offer=offer,
                is_read=False,
                defaults={
                    "title": f"Low stock: {offer.title}",
                    "body": f"Only {offer.available_stock} left.",
                    "business": offer.business,
                },
            )
            created += 1
    return f"flagged {created} low-stock offers"
