from rest_framework import serializers

from core.choices import UserRole

from .models import CustomerProfile, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "phone_number", "email", "username", "role", "is_phone_verified", "date_joined"]
        read_only_fields = ["id", "role", "is_phone_verified", "date_joined"]


class CustomerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = CustomerProfile
        fields = [
            "user", "preferred_city", "preferred_area", "last_latitude",
            "last_longitude", "notify_new_nearby_offers", "notify_followed_shops",
            "notify_saved_offer_expiry", "notify_price_drops",
        ]


class RequestOTPSerializer(serializers.Serializer):
    phone_number = serializers.CharField()


class VerifyOTPSerializer(serializers.Serializer):
    """Verifies the code and, for a brand-new phone number, creates the
    account in the same call — there's no separate "register" step. `role`
    and `username` are only used the first time a phone number signs in;
    for an existing account they're ignored (the account's role can't be
    changed by re-verifying)."""

    phone_number = serializers.CharField()
    otp = serializers.CharField()
    role = serializers.ChoiceField(choices=[UserRole.CUSTOMER, UserRole.SHOPKEEPER], required=False)
    username = serializers.CharField(required=False, allow_blank=True, max_length=150)
    guest_id = serializers.UUIDField(required=False, allow_null=True)
