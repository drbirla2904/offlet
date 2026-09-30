from django.db import models


class Notification(models.Model):
    class Kind(models.TextChoices):
        NEW_NEARBY_OFFER = "new_nearby_offer", "New nearby offer"
        FOLLOWED_SHOP_OFFER = "followed_shop_offer", "Followed shop posted"
        SAVED_OFFER_EXPIRING = "saved_offer_expiring", "Saved offer expiring"
        PRICE_DROP = "price_drop", "Price drop"
        LOW_STOCK = "low_stock", "Low stock"
        NEW_MESSAGE = "new_message", "New message"
        NEW_REVIEW = "new_review", "New review"
        OFFER_APPROVED = "offer_approved", "Offer approved"
        OFFER_REJECTED = "offer_rejected", "Offer rejected"
        VERIFICATION_UPDATE = "verification_update", "Verification update"
        REPORT_RECEIVED = "report_received", "Report received"
        OFFER_EXPIRING = "offer_expiring", "Offer expiring"
        HIGH_VIEWS = "high_views", "Offer getting many views"

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="notifications")
    kind = models.CharField(max_length=32, choices=Kind.choices)
    title = models.CharField(max_length=150)
    body = models.CharField(max_length=300, blank=True)
    offer = models.ForeignKey("offers.Offer", null=True, blank=True, on_delete=models.CASCADE, related_name="+")
    business = models.ForeignKey("businesses.Business", null=True, blank=True, on_delete=models.CASCADE, related_name="+")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "is_read"])]
