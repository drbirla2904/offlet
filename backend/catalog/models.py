from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=110, unique=True, blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text="Icon name/emoji for UI")
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="children")
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["order", "name"]
        indexes = [models.Index(fields=["slug"]), models.Index(fields=["is_active"])]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Product(models.Model):
    PRICING_STATIC = "static"
    PRICING_DYNAMIC = "dynamic"
    PRICING_CHOICES = [
        (PRICING_STATIC, "Static price"),
        (PRICING_DYNAMIC, "Dynamic / custom quote"),
    ]

    business = models.ForeignKey("businesses.Business", on_delete=models.CASCADE, related_name="products")
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name="products")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    brand = models.CharField(max_length=100, blank=True)
    sku = models.CharField(max_length=64, blank=True)
    pricing_mode = models.CharField(max_length=16, choices=PRICING_CHOICES, default=PRICING_STATIC)
    currency = models.CharField(max_length=8, default="INR")
    price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    price_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    price_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    price_note = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    video_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["business", "category"]), models.Index(fields=["pricing_mode", "is_active"])]
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="products/%Y/%m/")
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]
