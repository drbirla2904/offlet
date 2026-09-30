from django.db import models


class Conversation(models.Model):
    customer = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="conversations")
    business = models.ForeignKey("businesses.Business", on_delete=models.CASCADE, related_name="conversations")
    offer = models.ForeignKey("offers.Offer", null=True, blank=True, on_delete=models.SET_NULL, related_name="conversations")
    product = models.ForeignKey("catalog.Product", null=True, blank=True, on_delete=models.SET_NULL, related_name="conversations")
    is_blocked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("customer", "business")
        ordering = ["-updated_at"]


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="+")
    text = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
