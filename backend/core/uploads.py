from pathlib import Path

from PIL import Image, UnidentifiedImageError
from rest_framework import serializers

MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_VERIFICATION_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
DOCUMENT_FORMAT_BY_SUFFIX = {
    ".jpg": "JPEG",
    ".jpeg": "JPEG",
    ".png": "PNG",
    ".webp": "WEBP",
}


def validate_image_upload(upload):
    if upload.size > MAX_IMAGE_UPLOAD_BYTES:
        raise serializers.ValidationError("Images must be 10 MB or smaller.")
    return upload


def validate_verification_upload(upload):
    if upload.size > MAX_VERIFICATION_UPLOAD_BYTES:
        raise serializers.ValidationError("Verification files must be 10 MB or smaller.")

    suffix = Path(upload.name).suffix.lower()
    if suffix == ".pdf":
        upload.seek(0)
        is_pdf = upload.read(5) == b"%PDF-"
        upload.seek(0)
        if not is_pdf:
            raise serializers.ValidationError("The file content is not a valid PDF.")
        return upload

    expected_format = DOCUMENT_FORMAT_BY_SUFFIX.get(suffix)
    if not expected_format:
        raise serializers.ValidationError("Use a PDF, JPG, PNG, or WebP verification file.")

    try:
        upload.seek(0)
        with Image.open(upload) as image:
            if image.format != expected_format:
                raise serializers.ValidationError("The file extension does not match its image format.")
            image.verify()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise serializers.ValidationError("The uploaded image is invalid or unsafe.") from None
    finally:
        upload.seek(0)

    return upload