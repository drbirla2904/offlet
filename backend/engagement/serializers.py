from rest_framework import serializers

from core.uploads import validate_image_upload

from .models import FavoriteOffer, FollowBusiness, OfferReport, Review


class FavoriteOfferSerializer(serializers.ModelSerializer):
    """`offer` accepts a plain id on write (POST {"offer": <id>}), same as
    before — but on read, it's expanded to the full offer card shape, so the
    Saved-offers page can render it directly instead of getting a bare id."""

    class Meta:
        model = FavoriteOffer
        fields = ["id", "offer", "created_at"]
        read_only_fields = ["created_at"]

    def to_representation(self, instance):
        from offers.serializers import OfferListSerializer

        data = super().to_representation(instance)
        data["offer"] = OfferListSerializer(instance.offer, context=self.context).data
        return data


class FollowBusinessSerializer(serializers.ModelSerializer):
    """Same read/write split as FavoriteOfferSerializer, for `business`."""

    class Meta:
        model = FollowBusiness
        fields = ["id", "business", "created_at"]
        read_only_fields = ["created_at"]

    def to_representation(self, instance):
        from businesses.serializers import BusinessListSerializer

        data = super().to_representation(instance)
        data["business"] = BusinessListSerializer(instance.business, context=self.context).data
        return data


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Review
        fields = ["id", "user", "user_name", "business", "rating", "comment", "image", "created_at"]
        read_only_fields = ["user"]

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate_image(self, image):
        return validate_image_upload(image)


class OfferReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = OfferReport
        fields = ["id", "offer", "reason", "note", "is_resolved", "admin_action", "created_at"]
        read_only_fields = ["is_resolved", "admin_action"]
