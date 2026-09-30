from rest_framework import serializers

from .models import Business, BusinessPhoto, BusinessVerification


class BusinessPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessPhoto
        fields = ["id", "image", "order"]


class BusinessListSerializer(serializers.ModelSerializer):
    """Slim shape used inside offer cards / nearby lists."""

    distance_km = serializers.SerializerMethodField()
    is_verified = serializers.BooleanField(read_only=True)

    class Meta:
        model = Business
        fields = [
            "id", "name", "business_type", "category", "city", "area",
            "latitude", "longitude", "logo", "is_verified", "rating_average",
            "rating_count", "follower_count", "distance_km",
        ]

    def get_distance_km(self, obj):
        return getattr(obj, "distance_km", None)


class BusinessDetailSerializer(serializers.ModelSerializer):
    photos = BusinessPhotoSerializer(many=True, read_only=True)
    distance_km = serializers.SerializerMethodField()
    is_verified = serializers.BooleanField(read_only=True)
    is_following = serializers.SerializerMethodField()
    active_offer_count = serializers.SerializerMethodField()

    class Meta:
        model = Business
        fields = [
            "id", "owner", "name", "business_type", "category", "description",
            "address_line", "area", "city", "state", "pincode", "latitude",
            "longitude", "phone_number", "whatsapp_number", "opening_hours",
            "logo", "photos", "verification_status", "is_verified", "is_active",
            "rating_average", "rating_count", "follower_count", "distance_km",
            "is_following", "active_offer_count", "created_at",
        ]
        read_only_fields = [
            "owner", "verification_status", "rating_average", "rating_count",
            "follower_count",
        ]

    def validate_category(self, category):
        if category is not None and category.parent_id is not None:
            raise serializers.ValidationError(
                "Choose a top-level category (e.g. 'Fashion & Apparel'), not a specific sub-category — "
                "you'll pick the specific one per offer."
            )
        return category

    def get_distance_km(self, obj):
        return getattr(obj, "distance_km", None)

    def get_is_following(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.followers.filter(user=request.user).exists()

    def get_active_offer_count(self, obj):
        return obj.offers.filter(status="active").count()


class BusinessVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessVerification
        fields = ["id", "business", "document", "note", "status", "admin_note", "submitted_at", "decided_at"]
        read_only_fields = ["status", "admin_note", "decided_at"]
