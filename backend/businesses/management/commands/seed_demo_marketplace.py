from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from businesses.models import Business
from catalog.models import Category, Product
from core.choices import BusinessType, OfferStatus, OfferTag, OfferType, UserRole
from offers.models import Offer


DEMO_OWNER_PHONE = "999999999999"
DEMO_OWNER_USERNAME = "LocalOffers demo data owner"
DEMO_OWNER_EMAIL = "demo-owner@localoffers.invalid"
DEMO_NOTICE = "Fictional demonstration listing. Contact details are placeholders; do not call or visit."
BUSINESS_NAMES = (
    "Neighborhood Select", "City Market House", "Everyday Essentials", "Local Choice Store",
    "Main Street Finds", "Community Bazaar", "Town Square Goods", "Corner Market",
    "Goodlife Collection", "Market & More",
)
PRODUCTS_BY_GROUP = {
    "Fashion & Apparel": ["Everyday Cotton Kurta", "Comfort Denim Collection", "Classic Sandals"],
    "Electronics & Mobile": ["Portable Bluetooth Speaker", "USB-C Fast Charger", "Wireless Headphones"],
    "Grocery & Food": ["Daily Essentials Hamper", "Cold-Pressed Cooking Oil", "Fresh Breakfast Combo"],
    "Beauty & Wellness": ["Herbal Skincare Set", "Signature Wellness Session", "Everyday Grooming Kit"],
    "Home & Living": ["Cotton Bedsheet Set", "Ceramic Dinner Set", "Storage Organizer Bundle"],
    "Sports & Books": ["All-Purpose Training Mat", "Weekend Reading Bundle", "Everyday Sports Bottle"],
    "Automobile": ["Two-Wheeler Care Kit", "Car Interior Cleaning", "Roadside Essentials Pack"],
    "Services": ["Home Deep-Clean Service", "Air Conditioner Service Visit", "Local Repair Consultation"],
}
SECONDARY_TAGS = (OfferTag.HOT_DEAL, OfferTag.NEW, OfferTag.BEST_SELLER, OfferTag.PRICE_DROP)
OFFER_TYPES = (OfferType.PERCENTAGE, OfferType.FLASH_SALE, OfferType.CLEARANCE)


class Command(BaseCommand):
    help = "Create 100 clearly labeled demo shops with 2-3 active offers each."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=100, help="Number of demo shops to create (default: 100).")
        parser.add_argument(
            "--allow-production",
            action="store_true",
            help="Allow adding public demo listings when DEBUG=False.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["count"] < 1:
            raise CommandError("--count must be at least 1.")
        if not settings.DEBUG and not options["allow_production"]:
            raise CommandError("Refusing to add demo listings in production without --allow-production.")

        groups = list(
            Category.objects.filter(parent__isnull=True, is_active=True)
            .prefetch_related("children")
            .order_by("order", "name")
        )
        if not groups:
            raise CommandError("No categories found. Run `python manage.py seed_categories` first.")
        for group in groups:
            if not any(child.is_active for child in group.children.all()):
                raise CommandError(f'Category group "{group.name}" has no active sub-categories.')
            if group.name not in PRODUCTS_BY_GROUP:
                raise CommandError(f'No demo product templates are configured for "{group.name}".')

        owner = self._get_demo_owner()
        total_offers = 0
        now = timezone.now()
        for shop_index in range(options["count"]):
            group = groups[shop_index % len(groups)]
            leaves = [child for child in group.children.all() if child.is_active]
            offer_count = 2 + (shop_index % 2)
            latitude = 23.2599 + ((shop_index % 10) - 4.5) * 0.008
            longitude = 77.4126 + ((shop_index // 10) - 4.5) * 0.008
            business_name = f"[DEMO] {BUSINESS_NAMES[shop_index % len(BUSINESS_NAMES)]} {shop_index + 1:03d}"

            business, _ = Business.objects.update_or_create(
                owner=owner,
                name=business_name,
                defaults={
                    "business_type": self._business_type(group.name, shop_index),
                    "category": group,
                    "description": DEMO_NOTICE,
                    "address_line": f"Demo Market, Block {shop_index + 1:03d}",
                    "area": f"Demo Zone {shop_index % 10 + 1}",
                    "city": "Bhopal",
                    "state": "Madhya Pradesh",
                    "pincode": "000000",
                    "latitude": latitude,
                    "longitude": longitude,
                    "phone_number": "0000000000",
                    "whatsapp_number": "",
                    "is_active": True,
                },
            )

            for offer_index in range(offer_count):
                product_template = PRODUCTS_BY_GROUP[group.name][(shop_index + offer_index) % 3]
                product_name = f"{product_template} {shop_index + 1:03d}-{offer_index + 1:02d}"
                product, _ = Product.objects.update_or_create(
                    business=business,
                    sku=f"DEMO-{shop_index + 1:03d}-{offer_index + 1:02d}",
                    defaults={
                        "category": leaves[(shop_index + offer_index) % len(leaves)],
                        "name": product_name,
                        "description": DEMO_NOTICE,
                        "brand": "LocalOffers Demo",
                    },
                )

                discount = 10 + ((shop_index + offer_index) % 5) * 5
                original_price = Decimal(500 + ((shop_index * 137 + offer_index * 211) % 9500))
                offer_price = (original_price * Decimal(100 - discount) / Decimal(100)).quantize(Decimal("0.01"))
                offer_title = f"[DEMO] {product_name} - {discount}% off"
                Offer.objects.update_or_create(
                    business=business,
                    product=product,
                    title=offer_title,
                    defaults={
                        "offer_type": OFFER_TYPES[offer_index % len(OFFER_TYPES)],
                        "custom_description": DEMO_NOTICE,
                        "original_price": original_price,
                        "offer_price": offer_price,
                        "total_stock": 25 + ((shop_index + offer_index) % 75),
                        "tags": [OfferTag.DEMO, SECONDARY_TAGS[(shop_index + offer_index) % len(SECONDARY_TAGS)]],
                        "status": OfferStatus.ACTIVE,
                        "start_time": None,
                        "end_time": now + timedelta(days=30 + shop_index % 31),
                        "is_featured": offer_index == 0 and shop_index % 20 == 0,
                    },
                )
                total_offers += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {options['count']} demo shops and {total_offers} active demo offers across {len(groups)} categories."
            )
        )

    def _get_demo_owner(self):
        owner = User.objects.filter(phone_number=DEMO_OWNER_PHONE).first()
        if owner:
            if (
                owner.username != DEMO_OWNER_USERNAME
                or owner.email != DEMO_OWNER_EMAIL
                or owner.role != UserRole.SHOPKEEPER
                or owner.is_active
            ):
                raise CommandError("The reserved demo-owner phone number is already used by another account.")
            return owner

        owner = User.objects.create_user(
            phone_number=DEMO_OWNER_PHONE,
            username=DEMO_OWNER_USERNAME,
            email=DEMO_OWNER_EMAIL,
            role=UserRole.SHOPKEEPER,
            is_active=False,
            is_phone_verified=False,
        )
        owner.set_unusable_password()
        owner.save(update_fields=["password"])
        return owner

    @staticmethod
    def _business_type(group_name, shop_index):
        if group_name == "Services":
            return BusinessType.SERVICE
        if group_name == "Grocery & Food" and shop_index % 2:
            return BusinessType.RESTAURANT
        return BusinessType.SHOP