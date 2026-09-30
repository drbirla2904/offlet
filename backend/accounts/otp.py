"""
Phone OTP request/verify logic, kept separate from views.py so the actual
SMS-sending call is a single obvious place to swap in a real provider.
"""
import logging
import re
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import Throttled, ValidationError

from .models import PhoneOTP

logger = logging.getLogger(__name__)


def normalize_phone_number(raw: str) -> str:
    """Digits only, no '+', no spaces/dashes — e.g. '+91 98765-43210' -> '919876543210'.
    Accepts a bare 10-digit Indian mobile number too (left as-is at 10 digits;
    the SMS provider integration is the right place to add a '91' prefix if
    your gateway requires E.164, since that's provider-specific)."""
    digits = re.sub(r"\D", "", raw)
    if not (10 <= len(digits) <= 15):
        raise ValidationError({"phone_number": "Enter a valid phone number (10-15 digits)."})
    return digits


def send_sms(phone_number: str, message: str) -> None:
    """The one function to replace with a real SMS gateway (MSG91, Twilio,
    Exotel, AWS SNS — any of them, the interface here is deliberately just
    "phone number + message"). Until then: log it, and (only when DEBUG) the
    caller also returns the code directly in the API response so local dev
    and testing work with no SMS account configured at all."""
    logger.info("SMS to %s: %s", phone_number, message)


def request_otp(phone_number: str) -> PhoneOTP:
    phone_number = normalize_phone_number(phone_number)
    recent_window = timezone.now() - timedelta(hours=1)
    recent_count = PhoneOTP.objects.filter(phone_number=phone_number, created_at__gte=recent_window).count()
    if recent_count >= PhoneOTP.MAX_REQUESTS_PER_HOUR:
        raise Throttled(detail="Too many OTP requests for this number. Please try again later.")

    last = PhoneOTP.objects.filter(phone_number=phone_number).order_by("-created_at").first()
    if last and (timezone.now() - last.created_at).total_seconds() < PhoneOTP.RESEND_COOLDOWN_SECONDS:
        wait = PhoneOTP.RESEND_COOLDOWN_SECONDS - int((timezone.now() - last.created_at).total_seconds())
        raise Throttled(detail=f"Please wait {wait}s before requesting another code.")

    otp = PhoneOTP.generate(phone_number)
    send_sms(phone_number, _otp_message(otp.code))
    return otp


def _otp_message(code: str) -> str:
    """The trailing `@domain #code` line is required by the WebOTP API
    (https://web.dev/articles/web-otp) — it's how the browser knows this SMS
    is meant for *this* site and can offer to auto-fill the code without the
    user needing to switch apps to read it. The domain must exactly match
    the web origin FRONTEND_URL points at (no scheme, no path) — see
    PhoneOtpForm.tsx on the frontend for the matching navigator.credentials.get() call.
    """
    from urllib.parse import urlparse

    domain = urlparse(settings.FRONTEND_URL).netloc or settings.FRONTEND_URL
    return (
        f"Your LocalOffers verification code is {code}. "
        f"It expires in {PhoneOTP.OTP_VALIDITY_MINUTES} minutes.\n"
        f"@{domain} #{code}"
    )


def verify_otp(phone_number: str, code: str) -> bool:
    """Returns True/raises ValidationError. Marks the OTP used on success so
    it can't be replayed; increments attempt_count on failure and rejects
    once MAX_VERIFY_ATTEMPTS is hit, forcing a fresh code instead of allowing
    unlimited guesses against one OTP."""
    phone_number = normalize_phone_number(phone_number)
    otp = (
        PhoneOTP.objects.filter(phone_number=phone_number, is_used=False)
        .order_by("-created_at")
        .first()
    )
    if not otp or otp.is_expired:
        raise ValidationError({"otp": "This code has expired or is invalid — please request a new one."})
    if otp.attempt_count >= PhoneOTP.MAX_VERIFY_ATTEMPTS:
        raise ValidationError({"otp": "Too many incorrect attempts — please request a new code."})

    if otp.code != code:
        otp.attempt_count += 1
        otp.save(update_fields=["attempt_count"])
        remaining = PhoneOTP.MAX_VERIFY_ATTEMPTS - otp.attempt_count
        raise ValidationError({"otp": f"Incorrect code. {remaining} attempt(s) left."})

    otp.is_used = True
    otp.save(update_fields=["is_used"])
    return True
