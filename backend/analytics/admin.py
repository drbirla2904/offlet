from django.contrib import admin

from .models import OfferInteraction, OfferView, SearchEvent


@admin.register(OfferView)
class OfferViewAdmin(admin.ModelAdmin):
    list_display = ["offer", "user", "guest_id", "created_at"]
    readonly_fields = [f.name for f in OfferView._meta.fields]


@admin.register(OfferInteraction)
class OfferInteractionAdmin(admin.ModelAdmin):
    list_display = ["offer", "business", "interaction_type", "user", "created_at"]
    list_filter = ["interaction_type"]


@admin.register(SearchEvent)
class SearchEventAdmin(admin.ModelAdmin):
    list_display = ["query", "result_count", "created_at"]
