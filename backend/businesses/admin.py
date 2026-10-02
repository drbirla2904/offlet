from django.contrib import admin
from django.core.exceptions import PermissionDenied
from django.http import FileResponse, Http404
from django.urls import path, reverse
from django.utils.html import format_html

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
    list_display = ["business", "status", "submitted_at", "decided_at", "document_download"]
    list_filter = ["status"]
    fields = ["business", "document_download", "note", "status", "admin_note", "submitted_at", "decided_at"]
    readonly_fields = ["document_download", "submitted_at", "decided_at"]

    def has_add_permission(self, request):
        return False

    def get_urls(self):
        urls = [
            path(
                "<int:object_id>/download-document/",
                self.admin_site.admin_view(self.download_document),
                name="businesses_businessverification_download_document",
            )
        ]
        return urls + super().get_urls()

    @admin.display(description="Verification document")
    def document_download(self, obj):
        if not obj or not obj.pk or not obj.document:
            return "-"
        url = reverse("admin:businesses_businessverification_download_document", args=[obj.pk])
        return format_html('<a href="{}">Download document</a>', url)

    def download_document(self, request, object_id):
        verification = self.get_object(request, object_id)
        if verification is None or not verification.document:
            raise Http404
        if not self.has_view_or_change_permission(request, verification):
            raise PermissionDenied
        response = FileResponse(
            verification.document.open("rb"),
            as_attachment=True,
            filename=verification.document.name.rsplit("/", 1)[-1],
        )
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response
