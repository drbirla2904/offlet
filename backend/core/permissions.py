from rest_framework import permissions


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
