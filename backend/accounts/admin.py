from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import CustomerProfile, GuestSession, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """`phone_number` is USERNAME_FIELD now, not `email` — the base
    UserAdmin's add-user form is hardcoded to a `username` field (which our
    model still has, inherited from AbstractUser, just no longer used for
    login), so it still works for creating staff accounts from the admin UI,
    but `phone_number` needs to be in add_fieldsets too since it's required
    and unique at the DB level."""

    list_display = ["phone_number", "username", "email", "role", "is_active", "is_staff", "date_joined"]
    list_filter = ["role", "is_active", "is_staff"]
    ordering = ["-date_joined"]
    search_fields = ["phone_number", "username", "email"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Marketplace role", {"fields": ("role", "phone_number", "is_phone_verified")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "phone_number", "password1", "password2"),
        }),
    )


admin.site.register(CustomerProfile)
admin.site.register(GuestSession)
