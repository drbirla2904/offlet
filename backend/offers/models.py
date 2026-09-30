from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from core.choices import OfferStatus, OfferTag, OfferType


class OfferQuerySet(models.QuerySet):
    def visible_to_customers(self):
        """What guests/customers should ever see in listings — active AND
        inside its schedule window AND the business hasn't been suspended."""
        now = timezone.now()
        return self.filter(
            status=OfferStatus.ACTIVE,
            business__is_active=True,
        ).filter(
            models.Q(start_time__isnull=True) | models.Q(start_time__lte=now)
        ).filter(
            models.Q(end_time__isnull=True) | models.Q(end_time__gte=now)
        )


class Offer(models.Model):
    business = models.ForeignKey("businesses.Business", on_delete=models.CASCADE, related_name="offers")
    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="offers")

    offer_type = models.CharField(max_length=20, choices=OfferType.CHOICES, default=OfferType.PERCENTAGE)
    title = models.CharField(max_length=200, help_text="e.g. '50% OFF Men's Clothing'")
    custom_description = models.TextField(blank=True, help_text="Used when offer_type is 'custom'")

    original_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    offer_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    discount_percentage = models.PositiveIntegerField(default=0, editable=False)

    # Buy X Get Y / BOGO
    buy_quantity = models.PositiveIntegerField(null=True, blank=True)
    get_quantity = models.PositiveIntegerField(null=True, blank=True)

    # Stock (section 12)
    total_stock = models.PositiveIntegerField(null=True, blank=True, help_text="Leave blank for unlimited")
    sold_quantity = models.PositiveIntegerField(default=0)
    min_quantity_per_order = models.PositiveIntegerField(default=1)
    max_quantity_per_order = models.PositiveIntegerField(null=True, blank=True)
    auto_deactivate_on_sold_out = models.BooleanField(default=True)

    tags = models.JSONField(default=list, blank=True, help_text=f"Subset of {[c[0] for c in OfferTag.CHOICES]}")

    status = models.CharField(max_length=20, choices=OfferStatus.CHOICES, default=OfferStatus.DRAFT, db_index=True)
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)

    # Denormalized counters, updated by the analytics app — cheap for sorting/badges.
    view_count = models.PositiveIntegerField(default=0)
    favorite_count = models.PositiveIntegerField(default=0)
    share_count = models.PositiveIntegerField(default=0)

    is_featured = models.BooleanField(default=False)
    is_trending = models.BooleanField(default=False)
    is_sponsored = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = OfferQuerySet.as_manager()

    class Meta:
        indexes = [
            models.Index(fields=["status", "start_time", "end_time"]),
            models.Index(fields=["business", "status"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    @property
    def available_stock(self):
        if self.total_stock is None:
            return None
        return max(self.total_stock - self.sold_quantity, 0)

    @property
    def is_sold_out(self):
        return self.total_stock is not None and self.available_stock <= 0

    @property
    def is_expired_by_time(self):
        return bool(self.end_time and timezone.now() >= self.end_time)

    def _compute_discount(self):
        if self.original_price and self.offer_price and self.original_price > 0:
            pct = (self.original_price - self.offer_price) / self.original_price * 100
            self.discount_percentage = max(round(pct), 0)
        else:
            self.discount_percentage = 0

    def save(self, *args, **kwargs):
        self._compute_discount()
        super().save(*args, **kwargs)

    # ---- lifecycle actions (section 9) -------------------------------
    def publish(self):
        now = timezone.now()
        self.status = OfferStatus.SCHEDULED if self.start_time and self.start_time > now else OfferStatus.ACTIVE
        self.save(update_fields=["status", "updated_at"])

    def pause(self):
        self.status = OfferStatus.PAUSED
        self.save(update_fields=["status", "updated_at"])

    def resume(self):
        now = timezone.now()
        if self.end_time and self.end_time <= now:
            self.status = OfferStatus.EXPIRED
        elif self.start_time and self.start_time > now:
            self.status = OfferStatus.SCHEDULED
        elif self.is_sold_out:
            self.status = OfferStatus.SOLD_OUT
        else:
            self.status = OfferStatus.ACTIVE
        self.save(update_fields=["status", "updated_at"])

    def expire(self):
        self.status = OfferStatus.EXPIRED
        self.save(update_fields=["status", "updated_at"])

    def refresh_stock_status(self):
        """Call after decrementing sold_quantity. Auto-flips to SOLD_OUT / back."""
        if self.auto_deactivate_on_sold_out and self.is_sold_out and self.status == OfferStatus.ACTIVE:
            self.status = OfferStatus.SOLD_OUT
            self.save(update_fields=["status", "updated_at"])
        elif self.status == OfferStatus.SOLD_OUT and not self.is_sold_out:
            self.status = OfferStatus.ACTIVE
            self.save(update_fields=["status", "updated_at"])

    def duplicate(self):
        clone = Offer.objects.get(pk=self.pk)
        clone.pk = None
        clone.id = None
        clone.status = OfferStatus.DRAFT
        clone.sold_quantity = 0
        clone.view_count = 0
        clone.favorite_count = 0
        clone.share_count = 0
        clone.title = f"{self.title} (copy)"
        clone.save()
        return clone
