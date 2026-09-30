from django.contrib import admin

from .models import FavoriteOffer, FollowBusiness, OfferReport, Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["business", "user", "rating", "is_hidden", "created_at"]
    list_filter = ["is_hidden", "rating"]
    actions = ["hide_reviews", "unhide_reviews"]

    @admin.action(description="Hide selected reviews")
    def hide_reviews(self, request, queryset):
        queryset.update(is_hidden=True)

    @admin.action(description="Unhide selected reviews")
    def unhide_reviews(self, request, queryset):
        queryset.update(is_hidden=False)


@admin.register(OfferReport)
class OfferReportAdmin(admin.ModelAdmin):
    list_display = ["offer", "user", "reason", "is_resolved", "created_at"]
    list_filter = ["reason", "is_resolved"]
    actions = ["mark_resolved"]

    @admin.action(description="Mark resolved")
    def mark_resolved(self, request, queryset):
        queryset.update(is_resolved=True)


admin.site.register(FavoriteOffer)
admin.site.register(FollowBusiness)
