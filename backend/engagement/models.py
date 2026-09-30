from django.db import models

from core.choices import ReportReason


class FavoriteOffer(models.Model):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="favorite_offers")
    offer = models.ForeignKey("offers.Offer", on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "offer")


class FollowBusiness(models.Model):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="followed_businesses")
    business = models.ForeignKey("businesses.Business", on_delete=models.CASCADE, related_name="followers")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "business")


class Review(models.Model):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="reviews")
    business = models.ForeignKey("businesses.Business", on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    image = models.ImageField(upload_to="review_images/%Y/%m/", null=True, blank=True)
    is_hidden = models.BooleanField(default=False, help_text="Admin moderation")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "business")
        ordering = ["-created_at"]


class OfferReport(models.Model):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="offer_reports")
    offer = models.ForeignKey("offers.Offer", on_delete=models.CASCADE, related_name="reports")
    reason = models.CharField(max_length=20, choices=ReportReason.CHOICES)
    note = models.TextField(blank=True)
    is_resolved = models.BooleanField(default=False)
    admin_action = models.CharField(max_length=100, blank=True, help_text="e.g. 'offer hidden', 'business warned'")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
