from io import StringIO

from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import User
from catalog.models import Category
from core.choices import UserRole
from core.choices import OfferStatus, OfferTag
from offers.models import Offer

from .models import Business
from .serializers import BusinessVerificationSerializer


class BusinessBrowseTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		owner = User.objects.create_user(phone_number="919876543210", role=UserRole.SHOPKEEPER)
		self.nearby = Business.objects.create(
			owner=owner,
			name="Nearby shop",
			address_line="1 Market Road",
			city="Bhopal",
			phone_number="919876543210",
			latitude=23.2601,
			longitude=77.4126,
		)
		Business.objects.create(
			owner=owner,
			name="Far shop",
			address_line="2 Market Road",
			city="Bhopal",
			phone_number="919876543211",
			latitude=23.50,
			longitude=77.50,
		)

	def test_nearby_businesses_are_radius_filtered_and_distance_sorted(self):
		response = self.client.get(
			"/api/businesses/",
			{"lat": 23.2599, "lng": 77.4126, "radius_km": 10, "page_size": 1},
		)

		self.assertEqual(response.status_code, 200)
		self.assertEqual([item["id"] for item in response.data["results"]], [self.nearby.id])

	def test_incomplete_location_returns_client_error(self):
		response = self.client.get("/api/businesses/", {"lat": 23.2599})
		self.assertEqual(response.status_code, 400)

	def test_shopkeeper_must_accept_legal_policies_before_business_write(self):
		self.client.force_authenticate(self.nearby.owner)
		response = self.client.post("/api/businesses/", {}, format="json")
		self.assertEqual(response.status_code, 403)

	def test_shopkeeper_must_accept_policies_before_creating_business(self):
		self.client.force_authenticate(self.nearby.owner)
		response = self.client.post("/api/businesses/", {}, format="json")
		self.assertEqual(response.status_code, 403)

	def test_verification_document_is_not_returned_by_api(self):
		self.assertTrue(BusinessVerificationSerializer().fields["document"].write_only)


class DemoMarketplaceSeedTests(TestCase):
	@override_settings(DEBUG=True)
	def test_demo_seed_is_visible_categorized_and_idempotent(self):
		call_command("seed_categories", stdout=StringIO())
		call_command("seed_demo_marketplace", count=8, stdout=StringIO())
		call_command("seed_demo_marketplace", count=8, stdout=StringIO())

		businesses = Business.objects.filter(name__startswith="[DEMO]")
		offers = Offer.objects.filter(business__in=businesses)
		self.assertEqual(businesses.count(), 8)
		self.assertEqual(offers.count(), 20)
		self.assertEqual(
			set(businesses.values_list("category__name", flat=True)),
			set(Category.objects.filter(parent__isnull=True).values_list("name", flat=True)),
		)
		self.assertTrue(all(offer.status == OfferStatus.ACTIVE for offer in offers))
		self.assertTrue(all(OfferTag.DEMO in offer.tags for offer in offers))
		self.assertTrue(all(offer.product.category.parent_id == offer.business.category_id for offer in offers))
		self.assertFalse(businesses.first().owner.is_active)

		response = APIClient().get("/api/offers/")
		self.assertEqual(response.status_code, 200)
		self.assertEqual(len(response.data["results"]), 20)
		self.assertTrue(all(OfferTag.DEMO in offer["tags"] for offer in response.data["results"]))
