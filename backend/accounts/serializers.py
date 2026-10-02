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
    """Verifies a phone code without collecting profile details up front."""

    phone_number = serializers.CharField()
    otp = serializers.CharField()
    guest_id = serializers.UUIDField(required=False, allow_null=True)


class CompleteRegistrationSerializer(serializers.Serializer):
    registration_token = serializers.CharField()
    username = serializers.CharField(max_length=150)
    role = serializers.ChoiceField(choices=[UserRole.CUSTOMER, UserRole.SHOPKEEPER])
    guest_id = serializers.UUIDField(required=False, allow_null=True)


class AcceptShopkeeperLegalSerializer(serializers.Serializer):
    accept_terms = serializers.BooleanField()
    accept_privacy_policy = serializers.BooleanField()
    accept_offer_policy = serializers.BooleanField()

    def validate(self, attrs):
        if not all(attrs.values()):
            raise serializers.ValidationError("All shopkeeper policies must be accepted.")
        return attrs
