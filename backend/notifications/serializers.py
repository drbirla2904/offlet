from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    offer_title = serializers.CharField(source="offer.title", read_only=True)
    business_name = serializers.CharField(source="business.name", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id", "kind", "title", "body", "offer", "offer_title", "business",
            "business_name", "is_read", "created_at",
        ]
