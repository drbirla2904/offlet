from django.db import models

from core.choices import BusinessType, VerificationStatus


class Business(models.Model):
    """A shopkeeper's storefront. Kept as one model (rather than separate
    Business + Shop) for MVP simplicity — a business owner can extend this
    to multiple physical locations later via a `branches` FK if needed."""

    owner = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="businesses")
    name = models.CharField(max_length=150)
    business_type = models.CharField(max_length=20, choices=BusinessType.CHOICES, default=BusinessType.SHOP)
    category = models.ForeignKey("catalog.Category", on_delete=models.SET_NULL, null=True, related_name="businesses")
    description = models.TextField(blank=True)

    address_line = models.CharField(max_length=255)
    area = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, db_index=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=12, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    phone_number = models.CharField(max_length=20)
    whatsapp_number = models.CharField(max_length=20, blank=True)
    opening_hours = models.JSONField(
        default=dict, blank=True,
        help_text='e.g. {"mon": ["10:00","21:00"], "sun": null}',
    )

    logo = models.ImageField(upload_to="business_logos/", null=True, blank=True)

    verification_status = models.CharField(
        max_length=20, choices=VerificationStatus.CHOICES, default=VerificationStatus.UNVERIFIED
    )
    is_active = models.BooleanField(default=True, help_text="Admin can deactivate/suspend a business")

    # Denormalized, kept in sync via signals (engagement app) for cheap sorting.
    rating_average = models.FloatField(default=0)
    rating_count = models.PositiveIntegerField(default=0)
    follower_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "businesses"
        indexes = [
            models.Index(fields=["city", "is_active"]),
            models.Index(fields=["latitude", "longitude"]),
        ]

    def __str__(self):
        return self.name

    @property
    def is_verified(self):
        return self.verification_status == VerificationStatus.VERIFIED


class BusinessPhoto(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to="business_photos/%Y/%m/")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]


class BusinessVerification(models.Model):
    business = models.OneToOneField(Business, on_delete=models.CASCADE, related_name="verification_request")
    document = models.FileField(upload_to="business_documents/%Y/%m/")
    note = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=VerificationStatus.CHOICES, default=VerificationStatus.PENDING)
    admin_note = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    decided_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
