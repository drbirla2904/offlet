from django.contrib import admin

from .models import Business, BusinessPhoto, BusinessVerification


class BusinessPhotoInline(admin.TabularInline):
    model = BusinessPhoto
    extra = 1


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "city", "verification_status", "is_active", "rating_average"]
    list_filter = ["verification_status", "is_active", "business_type", "city"]
    search_fields = ["name", "city", "owner__email"]
    inlines = [BusinessPhotoInline]
    actions = ["approve_verification", "reject_verification", "suspend_business"]

    @admin.action(description="Approve verification")
    def approve_verification(self, request, queryset):
        queryset.update(verification_status="verified")

    @admin.action(description="Reject verification")
    def reject_verification(self, request, queryset):
        queryset.update(verification_status="rejected")

    @admin.action(description="Suspend business")
    def suspend_business(self, request, queryset):
        queryset.update(verification_status="suspended", is_active=False)


@admin.register(BusinessVerification)
class BusinessVerificationAdmin(admin.ModelAdmin):
    list_display = ["business", "status", "submitted_at", "decided_at"]
    list_filter = ["status"]
