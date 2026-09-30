from django.db import models

from core.choices import InteractionType


class OfferView(models.Model):
    offer = models.ForeignKey("offers.Offer", on_delete=models.CASCADE, related_name="view_events")
    user = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    guest_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["offer", "created_at"])]


class OfferInteraction(models.Model):
    """Call / WhatsApp / Directions / Share / Chat-initiated / Report clicks —
    exactly the events section 41 of the spec asks shopkeepers to see."""

    offer = models.ForeignKey("offers.Offer", on_delete=models.CASCADE, related_name="interaction_events")
    business = models.ForeignKey("businesses.Business", on_delete=models.CASCADE, related_name="interaction_events")
    user = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    guest_id = models.UUIDField(null=True, blank=True)
    interaction_type = models.CharField(max_length=20, choices=InteractionType.CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["business", "interaction_type", "created_at"])]


class SearchEvent(models.Model):
    query = models.CharField(max_length=200)
    user = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    guest_id = models.UUIDField(null=True, blank=True)
    result_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
