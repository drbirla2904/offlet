from rest_framework import serializers

from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "conversation", "sender", "text", "is_read", "created_at"]
        read_only_fields = ["sender", "is_read"]


class ConversationSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source="business.name", read_only=True)
    participant_name = serializers.SerializerMethodField()
    participant_phone = serializers.SerializerMethodField()
    participant_role = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id", "customer", "business", "business_name", "participant_name",
            "participant_phone", "participant_role", "offer", "product", "is_blocked",
            "last_message", "unread_count", "created_at", "updated_at",
        ]
        read_only_fields = ["customer"]

    def get_participant(self, obj):
        request = self.context.get("request")
        if request and request.user.id == obj.customer_id:
            return obj.business.owner
        return obj.customer

    def get_participant_name(self, obj):
        participant = self.get_participant(obj)
        display_name = participant.username.strip()
        if display_name and display_name != participant.phone_number:
            return display_name

        request = self.context.get("request")
        if request and request.user.id == obj.business.owner_id:
            return participant.phone_number
        return obj.business.name

    def get_participant_phone(self, obj):
        request = self.context.get("request")
        if request and request.user.id == obj.business.owner_id:
            return obj.customer.phone_number
        return obj.business.phone_number

    def get_participant_role(self, obj):
        return self.get_participant(obj).role

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        return MessageSerializer(msg).data if msg else None

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if not request:
            return 0
        return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
