from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from core.permissions import HasCurrentShopkeeperLegalAcceptance, IsBusinessOwner

from .models import Category, Product, ProductImage
from .serializers import CategorySerializer, ProductImageSerializer, ProductSerializer


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Public — guests browse categories freely (section 20).

    A business registers under one top-level GROUP (e.g. "Fashion &
    Apparel"); offers/products then only ever choose from that group's
    sub-categories, so a fashion shop never sees Electronics or Automobile
    options and vice versa. Query params:
    - ?top_level=true     groups only (for the business-registration picker)
    - ?parent=<id>        direct children of a given category
    - ?for_business=<id>  exactly what the offer form needs: that business's
                           category's children, or the category itself as a
                           single-item list if it has no children (so a
                           group like "Automobile" with a flat sub-list
                           still always has at least one valid choice)
    """

    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        if params.get("for_business"):
            from businesses.models import Business

            try:
                business = Business.objects.get(pk=params["for_business"])
            except Business.DoesNotExist:
                raise NotFound("No such business.")
            if not business.category_id:
                return qs.none()
            children = qs.filter(parent_id=business.category_id)
            return children if children.exists() else qs.filter(pk=business.category_id)

        if params.get("top_level") == "true":
            return qs.filter(parent__isnull=True)

        if params.get("parent"):
            return qs.filter(parent_id=params["parent"])

        return qs


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsBusinessOwner, HasCurrentShopkeeperLegalAcceptance]

    def get_queryset(self):
        qs = Product.objects.select_related("business", "category").prefetch_related("images")
        business_id = self.request.query_params.get("business")
        if business_id:
            qs = qs.filter(business_id=business_id)
        user = self.request.user
        if not user.is_authenticated:
            qs = qs.filter(is_active=True)
        elif user.is_staff:
            pass
        else:
            qs = qs.filter(Q(is_active=True) | Q(business__owner_id=user.id))
        return qs


class ProductImageViewSet(viewsets.ModelViewSet):
    serializer_class = ProductImageSerializer
    permission_classes = [permissions.IsAuthenticated, HasCurrentShopkeeperLegalAcceptance]

    def get_queryset(self):
        qs = ProductImage.objects.filter(product__business__owner=self.request.user)
        product_id = self.request.query_params.get("product")
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs

    @action(detail=True, methods=["post"])
    def set_primary(self, request, pk=None):
        image = self.get_object()
        ProductImage.objects.filter(product=image.product).update(is_primary=False)
        image.is_primary = True
        image.save(update_fields=["is_primary"])
        return Response(ProductImageSerializer(image).data)
