from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from analytics.models import OfferInteraction
from businesses.models import Business
from core.choices import InteractionType

from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer


class ConversationViewSet(viewsets.ModelViewSet):
    """Chat requires login for both sides (section 4 & 24). A customer starts
    a conversation with a business; the shopkeeper replies from their dashboard
    using the same endpoint, scoped by their owned businesses."""

    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        return (
            Conversation.objects.filter(customer=user)
            | Conversation.objects.filter(business__owner=user)
        ).select_related("customer", "business", "business__owner")

    def perform_create(self, serializer):
        business = serializer.validated_data["business"]
        conversation, _ = Conversation.objects.get_or_create(
            customer=self.request.user, business=business,
            defaults={
                "offer": serializer.validated_data.get("offer"),
                "product": serializer.validated_data.get("product"),
            },
        )
        serializer.instance = conversation
        OfferInteraction.objects.create(
            offer=serializer.validated_data.get("offer"),
            business=business,
            user=self.request.user,
            interaction_type=InteractionType.CHAT,
        ) if serializer.validated_data.get("offer") else None

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        if request.user.id not in (conversation.customer_id, conversation.business.owner_id):
            raise PermissionDenied("Not part of this conversation.")
        if conversation.is_blocked:
            return Response({"detail": "This conversation is blocked."}, status=status.HTTP_403_FORBIDDEN)

        if request.method == "GET":
            conversation.messages.exclude(sender=request.user).update(is_read=True)
            return Response(MessageSerializer(conversation.messages.all(), many=True).data)

        text = request.data.get("text", "").strip()
        if not text:
            return Response({"detail": "Message text required."}, status=status.HTTP_400_BAD_REQUEST)
        message = Message.objects.create(conversation=conversation, sender=request.user, text=text)
        conversation.save(update_fields=["updated_at"])
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def block(self, request, pk=None):
        conversation = self.get_object()
        if conversation.business.owner_id != request.user.id and conversation.customer_id != request.user.id:
            raise PermissionDenied()
        conversation.is_blocked = True
        conversation.save(update_fields=["is_blocked"])
        return Response({"status": "blocked"})
