from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from accounts.models import User
from businesses.models import Business
from catalog.models import Category, Product
from core.choices import OfferStatus, UserRole

from .models import Offer


class OfferBrowseTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		owner = User.objects.create_user(phone_number="919876543210", role=UserRole.SHOPKEEPER)
		category = Category.objects.create(name="Test category")
		self.business = Business.objects.create(
			owner=owner,
			name="Nearby shop",
			address_line="1 Market Road",
			city="Bhopal",
			phone_number="919876543210",
			latitude=23.2599,
			longitude=77.4126,
		)
		self.product = Product.objects.create(
			business=self.business,
			category=category,
			name="Test product",
		)

	def create_offer(self, title, latitude, longitude):
		self.business.latitude = latitude
		self.business.longitude = longitude
		self.business.save(update_fields=["latitude", "longitude"])
		return Offer.objects.create(
			business=self.business,
			product=self.product,
			title=title,
			original_price=100,
			offer_price=80,
			status=OfferStatus.ACTIVE,
		)

	def test_nearby_results_are_distance_sorted_and_database_paginated(self):
		farther = self.create_offer("Farther", 23.30, 77.45)
		nearer = self.create_offer("Nearer", 23.2601, 77.4126)

		with CaptureQueriesContext(connection) as queries:
			response = self.client.get(
				"/api/offers/",
				{"lat": 23.2599, "lng": 77.4126, "radius_km": 15, "ordering": "distance", "page_size": 1},
			)

		self.assertEqual(response.status_code, 200)
		self.assertEqual([item["id"] for item in response.data["results"]], [nearer.id])
		offer_selects = [
			query["sql"].upper()
			for query in queries
			if "OFFERS_OFFER" in query["sql"].upper() and "SELECT" in query["sql"].upper()
		]
		self.assertTrue(any("LIMIT" in sql for sql in offer_selects))
		self.assertNotEqual(farther.id, nearer.id)

	def test_invalid_coordinates_return_client_error(self):
		response = self.client.get("/api/offers/", {"lat": "north", "lng": 77.4})
		self.assertEqual(response.status_code, 400)

	def test_shopkeeper_must_accept_legal_policies_before_offer_write(self):
		self.client.force_authenticate(self.business.owner)
		response = self.client.post("/api/offers/", {}, format="json")
		self.assertEqual(response.status_code, 403)

	def test_shopkeeper_can_turn_off_offer_without_current_policy_acceptance(self):
		offer = self.create_offer("Active offer", 23.2599, 77.4126)
		self.client.force_authenticate(self.business.owner)
		response = self.client.post(f"/api/offers/{offer.id}/turn_off/", {}, format="json")
		self.assertEqual(response.status_code, 200)

	def test_shopkeeper_must_accept_policies_before_creating_offer(self):
		self.client.force_authenticate(self.business.owner)
		response = self.client.post("/api/offers/", {}, format="json")
		self.assertEqual(response.status_code, 403)

	def test_shopkeeper_can_turn_off_offer_without_current_acceptance(self):
		offer = self.create_offer("Active offer", 23.2599, 77.4126)
		self.client.force_authenticate(self.business.owner)
		response = self.client.post(f"/api/offers/{offer.id}/turn_off/", {}, format="json")
		self.assertEqual(response.status_code, 200)

	def test_radius_prefilter_removes_distant_shops_and_keeps_unknown_coordinates(self):
		nearby_offer = self.create_offer("Nearby", 23.2599, 77.4126)
		far_business = Business.objects.create(
			owner=self.business.owner,
			name="Distant shop",
			category=self.product.category,
			address_line="2 Far Road",
			city="Bhopal",
			phone_number="919876500001",
			latitude=24.0,
			longitude=77.4126,
		)
		far_product = Product.objects.create(
			business=far_business,
			category=self.product.category,
			name="Distant product",
		)
		far_offer = Offer.objects.create(
			business=far_business,
			product=far_product,
			title="Distant offer",
			original_price=100,
			offer_price=80,
			status=OfferStatus.ACTIVE,
		)
		unknown_business = Business.objects.create(
			owner=self.business.owner,
			name="Unmapped shop",
			category=self.product.category,
			address_line="3 Market Road",
			city="Bhopal",
			phone_number="919876500002",
		)
		unknown_product = Product.objects.create(
			business=unknown_business,
			category=self.product.category,
			name="Unmapped product",
		)
		unknown_offer = Offer.objects.create(
			business=unknown_business,
			product=unknown_product,
			title="Unmapped offer",
			original_price=100,
			offer_price=80,
			status=OfferStatus.ACTIVE,
		)

		response = self.client.get(
			"/api/offers/",
			{"lat": 23.2599, "lng": 77.4126, "radius_km": 15},
		)
		result_ids = {item["id"] for item in response.data["results"]}

		self.assertEqual(response.status_code, 200)
		self.assertIn(nearby_offer.id, result_ids)
		self.assertNotIn(far_offer.id, result_ids)
		self.assertIn(unknown_offer.id, result_ids)

	def test_search_matches_shop_name_and_tag_value_or_label(self):
		offer = self.create_offer("Weekend special", 23.2599, 77.4126)
		offer.tags = ["hot_deal"]
		offer.save(update_fields=["tags"])

		for query in ["Nearby shop", "hot_deal", "Hot Deal", "Weekend special", "Test category"]:
			with self.subTest(query=query):
				response = self.client.get("/api/offers/", {"search": query})
				self.assertEqual(response.status_code, 200)
				self.assertIn(offer.id, {item["id"] for item in response.data["results"]})

	def test_exact_tag_filter_returns_matching_offer(self):
		offer = self.create_offer("Tagged special", 23.2599, 77.4126)
		offer.tags = ["hot_deal"]
		offer.save(update_fields=["tags"])

		for tag in ["hot_deal", "Hot Deal"]:
			with self.subTest(tag=tag):
				response = self.client.get("/api/offers/", {"tag": tag})
				self.assertEqual(response.status_code, 200)
				self.assertIn(offer.id, {item["id"] for item in response.data["results"]})
