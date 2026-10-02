from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User


class ShopkeeperListingPolicyTests(TestCase):
	def test_shopkeeper_must_accept_policies_before_product_or_image_writes(self):
		client = APIClient()
		shopkeeper = User.objects.create_user(phone_number="919876500021", role="shopkeeper")
		client.force_authenticate(shopkeeper)

		product = client.post("/api/products/", {}, format="json")
		image = client.post("/api/product-images/", {}, format="multipart")

		self.assertEqual(product.status_code, 403)
		self.assertEqual(image.status_code, 403)
