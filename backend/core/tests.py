from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.exceptions import ValidationError

from core.uploads import (
	MAX_IMAGE_UPLOAD_BYTES,
	MAX_VERIFICATION_UPLOAD_BYTES,
	validate_image_upload,
	validate_verification_upload,
)


class HealthEndpointTests(TestCase):
	def test_liveness_endpoint(self):
		response = self.client.get("/health/live/")
		self.assertEqual(response.status_code, 200)


class UploadValidationTests(TestCase):
	def test_oversized_image_is_rejected(self):
		image = SimpleUploadedFile("large.jpg", b"x" * (MAX_IMAGE_UPLOAD_BYTES + 1), content_type="image/jpeg")
		with self.assertRaises(ValidationError):
			validate_image_upload(image)

	def test_oversized_verification_file_is_rejected(self):
		file = SimpleUploadedFile("large.pdf", b"%PDF-" + b"x" * MAX_VERIFICATION_UPLOAD_BYTES)
		with self.assertRaises(ValidationError):
			validate_verification_upload(file)

	def test_verification_file_extension_and_content_must_match(self):
		fake_pdf = SimpleUploadedFile("identity.pdf", b"not a pdf")
		with self.assertRaises(ValidationError):
			validate_verification_upload(fake_pdf)

	def test_readiness_endpoint(self):
		response = self.client.get("/health/ready/")
		self.assertEqual(response.status_code, 200)
