from rest_framework import serializers

from core.uploads import validate_image_upload

from .models import Category, Product, ProductImage


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "icon", "parent", "order"]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "product", "image", "is_primary", "order"]

    def validate_image(self, image):
        return validate_image_upload(image)

    def validate_product(self, product):
        request = self.context.get("request")
        if request and product.business.owner_id != request.user.id and not request.user.is_staff:
            raise serializers.ValidationError("You do not own this product.")
        return product


class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    display_price = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "business", "category", "category_name", "name", "description",
            "brand", "sku", "pricing_mode", "currency", "price", "price_min",
            "price_max", "price_note", "is_active", "video_url", "images",
            "display_price", "created_at",
        ]

    def get_display_price(self, obj):
        if obj.pricing_mode == Product.PRICING_STATIC:
            if obj.price is None:
                return None
            return f"{obj.price:.2f}"
        if obj.price_min is not None and obj.price_max is not None:
            return f"{obj.price_min:.2f} - {obj.price_max:.2f}"
        if obj.price_min is not None:
            return f"From {obj.price_min:.2f}"
        if obj.price is not None:
            return f"From {obj.price:.2f}"
        return obj.price_note or "Price on request"

    def validate_business(self, business):
        request = self.context.get("request")
        if request and business.owner_id != request.user.id and not request.user.is_staff:
            raise serializers.ValidationError("You do not own this business.")
        return business

    def validate(self, attrs):
        business = attrs.get("business") or getattr(self.instance, "business", None)
        category = attrs["category"] if "category" in attrs else getattr(self.instance, "category", None)
        pricing_mode = attrs.get("pricing_mode", getattr(self.instance, "pricing_mode", Product.PRICING_STATIC))

        if pricing_mode == Product.PRICING_STATIC:
            price = attrs.get("price", getattr(self.instance, "price", None))
            if price is None or price <= 0:
                raise serializers.ValidationError({"price": "Static catalog items need a fixed price greater than zero."})
        else:
            price_min = attrs.get("price_min", getattr(self.instance, "price_min", None))
            price_max = attrs.get("price_max", getattr(self.instance, "price_max", None))
            if not price_min and not price_max and not attrs.get("price_note") and not getattr(self.instance, "price_note", None):
                raise serializers.ValidationError({
                    "price_note": "Dynamic catalog items need a price range or a short note like 'starts at ₹699'."
                })
            if price_min is not None and price_max is not None and price_min > price_max:
                raise serializers.ValidationError({"price_max": "Maximum price should be greater than or equal to minimum price."})

        if business and category and business.category_id:
            valid_ids = set(Category.objects.filter(parent_id=business.category_id).values_list("id", flat=True))
            if not valid_ids:
                valid_ids = {business.category_id}
            if category.id not in valid_ids:
                raise serializers.ValidationError(
                    {"category": f"Choose a category under \"{business.category.name}\" — "
                                  f"that's the group this business registered under."}
                )
        return attrs
