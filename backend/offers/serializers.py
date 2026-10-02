from django.utils import timezone
from rest_framework import serializers

from businesses.serializers import BusinessListSerializer
from catalog.serializers import ProductSerializer

from .models import Offer


class OfferListSerializer(serializers.ModelSerializer):
    """Shape for offer cards (section 15) — home feed, search results, favorites."""

    business = BusinessListSerializer(read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_image = serializers.SerializerMethodField()
    distance_km = serializers.SerializerMethodField()
    available_stock = serializers.IntegerField(read_only=True)
    is_sold_out = serializers.BooleanField(read_only=True)
    seconds_remaining = serializers.SerializerMethodField()
    is_favorited = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = [
            "id", "business", "product_name", "product_image", "offer_type", "title",
            "original_price", "offer_price", "discount_percentage", "tags", "status",
            "start_time", "end_time", "available_stock", "is_sold_out", "seconds_remaining",
            "distance_km", "is_featured", "is_trending", "is_sponsored", "view_count",
            "favorite_count", "is_favorited", "created_at",
        ]

    def get_product_image(self, obj):
        images = getattr(obj.product, "prefetched_images", None)
        if images is None:
            images = list(obj.product.images.all())
            images.sort(key=lambda image: (not image.is_primary, image.order, image.id))
        img = images[0] if images else None
        if not img:
            return None
        request = self.context.get("request")
        url = img.image.url
        return request.build_absolute_uri(url) if request else url

    def get_distance_km(self, obj):
        return getattr(obj, "distance_km", None)

    def get_seconds_remaining(self, obj):
        if not obj.end_time:
            return None
        delta = (obj.end_time - timezone.now()).total_seconds()
        return max(int(delta), 0)

    def get_is_favorited(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        fav_ids = self.context.get("favorited_offer_ids")
        if fav_ids is not None:
            return obj.id in fav_ids
        return obj.favorited_by.filter(user=request.user).exists()


class OfferDetailSerializer(OfferListSerializer):
    product = ProductSerializer(read_only=True)

    class Meta(OfferListSerializer.Meta):
        fields = OfferListSerializer.Meta.fields + [
            "product", "custom_description", "buy_quantity", "get_quantity",
            "total_stock", "sold_quantity", "min_quantity_per_order",
            "max_quantity_per_order", "auto_deactivate_on_sold_out", "updated_at",
        ]


class OfferWriteSerializer(serializers.ModelSerializer):
    """Used by the shopkeeper dashboard to create/edit an offer. `original_price`
    + `offer_price` in, `discount_percentage` is computed automatically (section 7)."""

    class Meta:
        model = Offer
        fields = [
            "id", "business", "product", "offer_type", "title", "custom_description",
            "original_price", "offer_price", "buy_quantity", "get_quantity",
            "total_stock", "sold_quantity", "min_quantity_per_order",
            "max_quantity_per_order", "auto_deactivate_on_sold_out", "tags",
            "start_time", "end_time", "status", "discount_percentage",
        ]
        read_only_fields = ["discount_percentage"]

    def validate_business(self, business):
        request = self.context["request"]
        if business.owner_id != request.user.id:
            raise serializers.ValidationError("You do not own this business.")
        return business

    def validate(self, attrs):
        product = attrs.get("product") or getattr(self.instance, "product", None)
        business = attrs.get("business") or getattr(self.instance, "business", None)
        if product and business and product.business_id != business.id:
            raise serializers.ValidationError("Product must belong to the selected business.")
        return attrs
