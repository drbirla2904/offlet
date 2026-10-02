from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from accounts.models import ShopkeeperLegalAcceptance
from businesses.models import Business
from core.legal import OFFER_POLICY_VERSION, PRIVACY_POLICY_VERSION, SHOPKEEPER_TERMS_VERSION

from .models import Category, Product


class ShopkeeperListingPolicyTests(TestCase):
	def test_shopkeeper_must_accept_policies_before_product_or_image_writes(self):
		client = APIClient()
		shopkeeper = User.objects.create_user(phone_number="919876500021", role="shopkeeper")
		client.force_authenticate(shopkeeper)

		product = client.post("/api/products/", {}, format="json")
		image = client.post("/api/product-images/", {}, format="multipart")

		self.assertEqual(product.status_code, 403)
		self.assertEqual(image.status_code, 403)

	def test_shopkeeper_can_create_static_and_dynamic_catalog_items_with_prices(self):
		client = APIClient()
		shopkeeper = User.objects.create_user(phone_number="919876500022", role="shopkeeper")
		ShopkeeperLegalAcceptance.objects.create(
			user=shopkeeper,
			terms_version=SHOPKEEPER_TERMS_VERSION,
			privacy_policy_version=PRIVACY_POLICY_VERSION,
			offer_policy_version=OFFER_POLICY_VERSION,
		)
		category = Category.objects.create(name="Home Decor", slug="home-decor")
		business = Business.objects.create(
			owner=shopkeeper,
			name="Kraft & Co.",
			category=category,
			address_line="123 Main Rd",
			area="Connaught Place",
			city="Delhi",
			phone_number="919876500022",
		)
		client.force_authenticate(shopkeeper)

		static_response = client.post(
			"/api/products/",
			{
				"business": business.id,
				"category": category.id,
				"name": "Handmade Ceramic Vase",
				"description": "Neutral-toned vase for desks and bookshelves.",
				"price": "1499.00",
				"pricing_mode": "static",
			},
			format="json",
		)
		self.assertEqual(static_response.status_code, 201, static_response.json())
		self.assertEqual(static_response.json()["price"], "1499.00")

		dynamic_response = client.post(
			"/api/products/",
			{
				"business": business.id,
				"category": category.id,
				"name": "Custom Wall Art",
				"description": "Made to order with color customisation options.",
				"pricing_mode": "dynamic",
				"price_min": "2499.00",
				"price_max": "5999.00",
				"price_note": "Starts at ₹2,499 depending on size and finish.",
			},
			format="json",
		)
		self.assertEqual(dynamic_response.status_code, 201, dynamic_response.json())
		self.assertEqual(dynamic_response.json()["pricing_mode"], "dynamic")
		self.assertEqual(Product.objects.filter(business=business).count(), 2)

	def test_hidden_catalog_items_are_only_visible_to_their_owner(self):
		shopkeeper = User.objects.create_user(phone_number="919876500023", role="shopkeeper")
		customer = User.objects.create_user(phone_number="919876500024", role="customer")
		business = Business.objects.create(
			owner=shopkeeper,
			name="Hidden Goods",
			address_line="123 Main Rd",
			area="Connaught Place",
			city="Delhi",
			phone_number="919876500023",
		)
		Product.objects.create(
			business=business,
			name="Unpublished item",
			pricing_mode=Product.PRICING_STATIC,
			price="100.00",
			is_active=False,
		)
		client = APIClient()

		self.assertEqual(client.get(f"/api/products/?business={business.id}").json()["count"], 0)
		client.force_authenticate(customer)
		self.assertEqual(client.get(f"/api/products/?business={business.id}").json()["count"], 0)
		client.force_authenticate(shopkeeper)
		self.assertEqual(client.get(f"/api/products/?business={business.id}").json()["count"], 1)
