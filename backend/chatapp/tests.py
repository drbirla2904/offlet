from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from businesses.models import Business
from .models import Conversation

User = get_user_model()


class ConversationParticipantTests(APITestCase):
	def setUp(self):
		self.customer = User.objects.create_user(
			phone_number="+15551234567",
			username="Asha Rao",
			role="customer",
		)
		self.shopkeeper = User.objects.create_user(
			phone_number="+15557654321",
			username="Ravi Shop",
			role="shopkeeper",
		)
		self.business = Business.objects.create(
			owner=self.shopkeeper,
			name="Ravi Stores",
			address_line="12 Market Road",
			city="Bhopal",
			phone_number="+911234567890",
		)
		self.conversation = Conversation.objects.create(
			customer=self.customer,
			business=self.business,
		)

	def test_shopkeeper_sees_customer_name_and_phone(self):
		self.client.force_authenticate(self.shopkeeper)

		response = self.client.get("/api/conversations/")

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		participant = response.data["results"][0]
		self.assertEqual(participant["participant_name"], "Asha Rao")
		self.assertEqual(participant["participant_phone"], "+15551234567")
		self.assertEqual(participant["participant_role"], "customer")

	def test_customer_sees_shopkeeper_name_and_public_business_phone(self):
		self.client.force_authenticate(self.customer)

		response = self.client.get("/api/conversations/")

		participant = response.data["results"][0]
		self.assertEqual(participant["participant_name"], "Ravi Shop")
		self.assertEqual(participant["participant_phone"], self.business.phone_number)
		self.assertEqual(participant["participant_role"], "shopkeeper")

	def test_shopkeeper_can_identify_customer_without_display_name_by_phone(self):
		self.customer.username = self.customer.phone_number
		self.customer.save(update_fields=["username"])
		self.client.force_authenticate(self.shopkeeper)

		response = self.client.get("/api/conversations/")

		participant = response.data["results"][0]
		self.assertEqual(participant["participant_name"], self.customer.phone_number)

	def test_nonparticipant_cannot_read_conversation_identity(self):
		stranger = User.objects.create_user(
			phone_number="+15559876543",
			username="Other Customer",
			role="customer",
		)
		self.client.force_authenticate(stranger)

		response = self.client.get(f"/api/conversations/{self.conversation.id}/")

		self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
