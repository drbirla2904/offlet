from rest_framework import serializers

from .models import Category, Product, ProductImage


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "icon", "parent", "order"]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "product", "image", "is_primary", "order"]

    def validate_product(self, product):
        request = self.context.get("request")
        if request and product.business.owner_id != request.user.id and not request.user.is_staff:
            raise serializers.ValidationError("You do not own this product.")
        return product


class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "business", "category", "category_name", "name", "description",
            "brand", "sku", "video_url", "images", "created_at",
        ]

    def validate_business(self, business):
        request = self.context.get("request")
        if request and business.owner_id != request.user.id and not request.user.is_staff:
            raise serializers.ValidationError("You do not own this business.")
        return business

    def validate(self, attrs):
        business = attrs.get("business") or getattr(self.instance, "business", None)
        category = attrs["category"] if "category" in attrs else getattr(self.instance, "category", None)
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
