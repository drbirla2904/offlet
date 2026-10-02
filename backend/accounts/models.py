import secrets
from datetime import timedelta

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from core.choices import UserRole


class UserManager(BaseUserManager):
    """AbstractUser's default manager hardcodes `username` as its
    create_user/create_superuser parameter name — since USERNAME_FIELD is
    `phone_number` here, `manage.py createsuperuser` would otherwise crash
    with a TypeError (it calls create_superuser(phone_number=...) as a
    keyword arg, which the default manager's signature doesn't accept).
    This is the standard fix whenever USERNAME_FIELD isn't 'username'."""

    use_in_migrations = True

    def _create_user(self, phone_number, password, **extra_fields):
        if not phone_number:
            raise ValueError("Phone number is required.")
        extra_fields.setdefault("username", phone_number)
        user = self.model(phone_number=phone_number, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, phone_number, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(phone_number, password, **extra_fields)

    def create_superuser(self, phone_number, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", UserRole.ADMIN)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(phone_number, password, **extra_fields)


class User(AbstractUser):
    """Custom user. `role` drives permissions.

    Phone number + OTP is the only sign-in method (matches how the target
    market actually signs into local apps — no password to remember, no
    email required). `phone_number` is the login identifier; `email` is
    optional (nullable rather than blank-string, so multiple accounts
    without one don't collide on the unique constraint). `username` is
    kept only as an optional display name — no longer globally unique,
    since phone_number is what actually identifies an account now.
    """

    username = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=20, choices=UserRole.CHOICES, default=UserRole.CUSTOMER)
    phone_number = models.CharField(max_length=15, unique=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    is_phone_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "phone_number"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return f"{self.phone_number} ({self.role})"


class PhoneOTP(models.Model):
    """A one-time code sent to a phone number for login/registration.

    No real SMS is wired up yet — see `accounts/otp.py`'s `send_sms` for the
    one function to replace with a real gateway (MSG91/Twilio/Exotel are the
    common choices for Indian phone numbers). Until then, in DEBUG mode the
    code is returned directly in the API response and logged to the console,
    so local development and testing work without any SMS account at all.
    """

    OTP_LENGTH = 6
    OTP_VALIDITY_MINUTES = 5
    MAX_VERIFY_ATTEMPTS = 5
    RESEND_COOLDOWN_SECONDS = 30
    MAX_REQUESTS_PER_HOUR = 5

    phone_number = models.CharField(max_length=15, db_index=True)
    code = models.CharField(max_length=OTP_LENGTH)
    is_used = models.BooleanField(default=False)
    attempt_count = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        indexes = [models.Index(fields=["phone_number", "is_used", "expires_at"])]
        ordering = ["-created_at"]

    @classmethod
    def generate(cls, phone_number):
        code = f"{secrets.randbelow(10 ** cls.OTP_LENGTH):0{cls.OTP_LENGTH}d}"
        return cls.objects.create(
            phone_number=phone_number,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=cls.OTP_VALIDITY_MINUTES),
        )

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at


class CustomerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="customer_profile")
    preferred_city = models.CharField(max_length=100, blank=True)
    preferred_area = models.CharField(max_length=100, blank=True)
    last_latitude = models.FloatField(null=True, blank=True)
    last_longitude = models.FloatField(null=True, blank=True)
    preferred_categories = models.ManyToManyField("catalog.Category", blank=True, related_name="+")
    notify_new_nearby_offers = models.BooleanField(default=True)
    notify_followed_shops = models.BooleanField(default=True)
    notify_saved_offer_expiry = models.BooleanField(default=True)
    notify_price_drops = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile<{self.user.phone_number}>"


class GuestSession(models.Model):
    """Non-sensitive temporary preferences for guests, keyed by a client-generated
    UUID stored in the browser (see frontend `useGuestId`). Migrated into
    CustomerProfile on registration (see accounts.services.migrate_guest_session)."""

    guest_id = models.UUIDField(unique=True)
    city = models.CharField(max_length=100, blank=True)
    area = models.CharField(max_length=100, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    recently_viewed_offer_ids = models.JSONField(default=list, blank=True)
    search_history = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)


class ShopkeeperLegalAcceptance(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="shopkeeper_legal_acceptances")
    terms_version = models.CharField(max_length=32)
    privacy_policy_version = models.CharField(max_length=32)
    offer_policy_version = models.CharField(max_length=32)
    accepted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-accepted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "terms_version", "privacy_policy_version", "offer_policy_version"],
                name="unique_shopkeeper_legal_acceptance",
            )
        ]

    def __str__(self):
        return f"Shopkeeper legal acceptance for user {self.user_id} ({self.accepted_at:%Y-%m-%d})"
