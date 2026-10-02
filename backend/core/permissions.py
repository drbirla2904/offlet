from rest_framework import permissions

from .choices import UserRole
from .legal import OFFER_POLICY_VERSION, PRIVACY_POLICY_VERSION, SHOPKEEPER_TERMS_VERSION


class IsShopkeeper(permissions.BasePermission):
    message = "Only shopkeeper accounts can perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "shopkeeper"
        )


class IsBusinessOwner(permissions.BasePermission):
    """Object-level: only the business owner (or admin) may write."""

    message = "You do not own this business."

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        owner_id = getattr(obj, "owner_id", None) or getattr(
            getattr(obj, "business", None), "owner_id", None
        )
        return request.user.is_staff or owner_id == request.user.id


class HasCurrentShopkeeperLegalAcceptance(permissions.BasePermission):
    message = "Accept the current shopkeeper terms, privacy policy, and offer rules before managing listings."

    def has_permission(self, request, view):
        user = request.user
        if request.method in permissions.SAFE_METHODS or not user.is_authenticated:
            return True
        if user.is_staff or user.role != UserRole.SHOPKEEPER:
            return True
        if getattr(view, "action", None) == "turn_off":
            return True

        from accounts.models import ShopkeeperLegalAcceptance

        return ShopkeeperLegalAcceptance.objects.filter(
            user=user,
            terms_version=SHOPKEEPER_TERMS_VERSION,
            privacy_policy_version=PRIVACY_POLICY_VERSION,
            offer_policy_version=OFFER_POLICY_VERSION,
        ).exists()


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        user_field = getattr(obj, "user_id", None) or getattr(obj, "customer_id", None)
        return request.user.is_staff or user_field == request.user.id


class ReadOnlyOrAuthenticated(permissions.BasePermission):
    """Guests can GET/HEAD/OPTIONS; everything else needs login."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)
