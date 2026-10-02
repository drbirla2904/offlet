import re
from unittest.mock import patch

from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured
from django.test import TestCase
from django.test import override_settings
from rest_framework.test import APIClient

from .models import PhoneOTP, ShopkeeperLegalAcceptance, User
from .otp import console_sms_backend, request_otp


class OTPProtectionTests(TestCase):
	def test_otp_is_six_digits(self):
		otp = PhoneOTP.generate("919876543210")
		self.assertRegex(otp.code, re.compile(r"^\d{6}$"))

	def test_otp_request_is_throttled_by_client_ip(self):
		cache.clear()
		client = APIClient()
		with patch("accounts.otp.send_sms"):
			responses = [
				client.post("/api/auth/otp/request/", {"phone_number": f"987650000{index}"}, format="json")
				for index in range(1, 5)
			]

		self.assertEqual([response.status_code for response in responses], [200, 200, 200, 429])

	def test_disabled_account_cannot_request_sms_or_authenticate(self):
		cache.clear()
		phone_number = "999999999999"
		User.objects.create_user(phone_number=phone_number, is_active=False)

		with patch("accounts.otp.send_sms") as send_sms:
			request = APIClient().post("/api/auth/otp/request/", {"phone_number": phone_number}, format="json")
			self.assertEqual(request.status_code, 200)
			send_sms.assert_not_called()

		otp = PhoneOTP.objects.get(phone_number=phone_number)
		response = APIClient().post(
			"/api/auth/otp/verify/",
			{"phone_number": phone_number, "otp": otp.code},
			format="json",
		)
		self.assertEqual(response.status_code, 401)

	@override_settings(DEBUG=False)
	def test_console_sms_backend_refuses_to_log_otp_in_production(self):
		with self.assertRaises(ImproperlyConfigured):
			console_sms_backend("919876543210", "OTP should never be logged")

	def test_failed_sms_delivery_removes_unsent_otp(self):
		with patch("accounts.otp.send_sms", side_effect=RuntimeError("provider unavailable")):
			with self.assertRaises(RuntimeError):
				request_otp("919876543210")

		self.assertFalse(PhoneOTP.objects.filter(phone_number="919876543210").exists())


class OTPRegistrationFlowTests(TestCase):
	def setUp(self):
		cache.clear()
		self.client = APIClient()

	def test_new_number_completes_profile_after_otp(self):
		phone_number = "919876543210"
		otp = PhoneOTP.generate(phone_number)
		verified = self.client.post(
			"/api/auth/otp/verify/",
			{"phone_number": "+91 98765 43210", "otp": otp.code},
			format="json",
		)

		self.assertEqual(verified.status_code, 202)
		self.assertTrue(verified.data["requires_profile_setup"])
		self.assertFalse(User.objects.filter(phone_number=phone_number).exists())

		completed = self.client.post(
			"/api/auth/signup/complete/",
			{
				"registration_token": verified.data["registration_token"],
				"username": "Asha",
				"role": "shopkeeper",
			},
			format="json",
		)

		self.assertEqual(completed.status_code, 201)
		self.assertEqual(completed.data["user"]["username"], "Asha")
		self.assertEqual(completed.data["user"]["role"], "shopkeeper")
		self.assertTrue(completed.data["created"])

	def test_existing_number_signs_in_without_changing_profile(self):
		user = User.objects.create_user(
			phone_number="919876543210",
			username="Existing user",
			role="shopkeeper",
			is_phone_verified=False,
		)
		otp = PhoneOTP.generate(user.phone_number)

		response = self.client.post(
			"/api/auth/otp/verify/",
			{
				"phone_number": "+91 98765 43210",
				"otp": otp.code,
				"username": "Different name",
				"role": "customer",
			},
			format="json",
		)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data["user"]["id"], user.id)
		self.assertEqual(response.data["user"]["username"], "Existing user")
		self.assertEqual(response.data["user"]["role"], "shopkeeper")
		self.assertFalse(response.data["created"])
		self.assertTrue(response.data["tokens"]["access"])

	def test_invalid_registration_ticket_is_rejected(self):
		response = self.client.post(
			"/api/auth/signup/complete/",
			{"registration_token": "invalid", "username": "Asha", "role": "customer"},
			format="json",
		)
		self.assertEqual(response.status_code, 401)


class ShopkeeperLegalAcceptanceTests(TestCase):
	def setUp(self):
		self.user = User.objects.create_user(phone_number="919876500011", role="shopkeeper")
		self.client = APIClient()
		self.client.force_authenticate(self.user)

	def test_shopkeeper_can_accept_current_policy_versions(self):
		status_response = self.client.get("/api/auth/shopkeeper-legal/")
		self.assertEqual(status_response.status_code, 200)
		self.assertFalse(status_response.data["accepted"])

		accepted = self.client.post(
			"/api/auth/shopkeeper-legal/",
			{
				"accept_terms": True,
				"accept_privacy_policy": True,
				"accept_offer_policy": True,
			},
			format="json",
		)

		self.assertEqual(accepted.status_code, 201)
		self.assertTrue(accepted.data["accepted"])
		self.assertTrue(accepted.data["accepted_at"])
		self.assertEqual(ShopkeeperLegalAcceptance.objects.filter(user=self.user).count(), 1)

	def test_shopkeeper_cannot_accept_without_checking_every_policy(self):
		response = self.client.post(
			"/api/auth/shopkeeper-legal/",
			{
				"accept_terms": True,
				"accept_privacy_policy": True,
				"accept_offer_policy": False,
			},
			format="json",
		)
		self.assertEqual(response.status_code, 400)
		self.assertFalse(ShopkeeperLegalAcceptance.objects.exists())

	def test_customer_cannot_accept_shopkeeper_policies(self):
		customer = User.objects.create_user(phone_number="919876500012", role="customer")
		self.client.force_authenticate(customer)
		response = self.client.post(
			"/api/auth/shopkeeper-legal/",
			{
				"accept_terms": True,
				"accept_privacy_policy": True,
				"accept_offer_policy": True,
			},
			format="json",
		)
		self.assertEqual(response.status_code, 403)
