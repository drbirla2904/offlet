from django.contrib import admin

from .models import Offer


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = [
        "title", "business", "offer_type", "status", "original_price",
        "offer_price", "discount_percentage", "available_stock", "start_time", "end_time",
    ]
    list_filter = ["status", "offer_type", "is_featured", "is_trending", "is_sponsored"]
    search_fields = ["title", "business__name", "product__name"]
    actions = ["mark_featured", "mark_trending", "mark_sponsored"]

    @admin.action(description="Mark as Featured")
    def mark_featured(self, request, queryset):
        queryset.update(is_featured=True)

    @admin.action(description="Mark as Trending")
    def mark_trending(self, request, queryset):
        queryset.update(is_trending=True)

    @admin.action(description="Mark as Sponsored")
    def mark_sponsored(self, request, queryset):
        queryset.update(is_sponsored=True)
