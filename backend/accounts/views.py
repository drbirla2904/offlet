from django.core import signing
from django.db import IntegrityError, transaction
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.exceptions import AuthenticationFailed

from core.choices import UserRole

from . import otp as otp_lib
from .models import CustomerProfile, GuestSession, ShopkeeperLegalAcceptance, User
from core.legal import OFFER_POLICY_VERSION, PRIVACY_POLICY_VERSION, SHOPKEEPER_TERMS_VERSION
from .serializers import (
    AcceptShopkeeperLegalSerializer,
    CompleteRegistrationSerializer,
    CustomerProfileSerializer,
    RequestOTPSerializer,
    UserSerializer,
    VerifyOTPSerializer,
)


def _tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


class RequestOTPView(APIView):
    """POST {phone_number} -> sends (or, in DEBUG, also returns) a 6-digit
    code. Works the same whether the number is new or already registered —
    there's no separate "does this account exist" check here, so this
    endpoint can't be used to enumerate registered phone numbers."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp_request"

    def post(self, request):
        serializer = RequestOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        otp = otp_lib.request_otp(serializer.validated_data["phone_number"])
        payload = {"status": "sent", "expires_in": otp.OTP_VALIDITY_MINUTES * 60}
        from django.conf import settings

        if settings.DEBUG:
            payload["debug_otp"] = otp.code  # never present when DEBUG=False
        return Response(payload)


class VerifyOTPView(APIView):
    """Verify a code; existing users sign in, while new users receive a setup ticket."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp_verify"

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        phone_number = otp_lib.normalize_phone_number(data["phone_number"])
        otp_lib.verify_otp(phone_number, data["otp"])

        user = User.objects.filter(phone_number=phone_number).first()
        if user is None and phone_number.startswith("91") and len(phone_number) == 12:
            # Keep accounts created with the previous bare 10-digit Indian format sign-in capable.
            user = User.objects.filter(phone_number=phone_number[2:]).first()

        if user is None:
            registration_token = signing.dumps(
                {"phone_number": phone_number},
                salt="accounts.complete_registration",
            )
            return Response(
                {"requires_profile_setup": True, "registration_token": registration_token},
                status=status.HTTP_202_ACCEPTED,
            )

        if not user.is_active:
            raise AuthenticationFailed("This account is disabled.")
        if not user.is_phone_verified:
            # Covers an account created some other way (e.g. via Django
            # admin) that hadn't verified its phone yet.
            user.is_phone_verified = True
            user.save(update_fields=["is_phone_verified"])

        return Response(
            {"user": UserSerializer(user).data, "tokens": _tokens_for(user), "created": False},
            status=status.HTTP_200_OK,
        )


class CompleteRegistrationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = CompleteRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            ticket = signing.loads(
                data["registration_token"],
                salt="accounts.complete_registration",
                max_age=600,
            )
        except signing.BadSignature:
            raise AuthenticationFailed("Your verified session expired. Please request a new code.")

        phone_number = ticket.get("phone_number") if isinstance(ticket, dict) else None
        if not phone_number:
            raise AuthenticationFailed("Your verified session is invalid. Please request a new code.")

        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    phone_number=phone_number,
                    username=data["username"].strip(),
                    role=data["role"],
                    is_phone_verified=True,
                )
                if user.role == UserRole.CUSTOMER:
                    profile = CustomerProfile.objects.create(user=user)
                    guest_id = data.get("guest_id")
                    if guest_id:
                        from .services import migrate_guest_session

                        migrate_guest_session(guest_id, profile)
        except IntegrityError:
            raise AuthenticationFailed("An account already exists for this number. Please sign in again.")

        return Response(
            {"user": UserSerializer(user).data, "tokens": _tokens_for(user), "created": True},
            status=status.HTTP_201_CREATED,
        )


class ShopkeeperLegalStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _current_acceptance(self, user):
        return ShopkeeperLegalAcceptance.objects.filter(
            user=user,
            terms_version=SHOPKEEPER_TERMS_VERSION,
            privacy_policy_version=PRIVACY_POLICY_VERSION,
            offer_policy_version=OFFER_POLICY_VERSION,
        ).first()

    def _payload(self, acceptance):
        return {
            "accepted": acceptance is not None,
            "terms_version": SHOPKEEPER_TERMS_VERSION,
            "privacy_policy_version": PRIVACY_POLICY_VERSION,
            "offer_policy_version": OFFER_POLICY_VERSION,
            "accepted_at": acceptance.accepted_at if acceptance else None,
        }

    def get(self, request):
        if request.user.role != UserRole.SHOPKEEPER:
            return Response({"detail": "Only shopkeeper accounts have merchant policies."}, status=403)
        return Response(self._payload(self._current_acceptance(request.user)))

    def post(self, request):
        if request.user.role != UserRole.SHOPKEEPER:
            return Response({"detail": "Only shopkeeper accounts can accept merchant policies."}, status=403)
        serializer = AcceptShopkeeperLegalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        acceptance, _ = ShopkeeperLegalAcceptance.objects.get_or_create(
            user=request.user,
            terms_version=SHOPKEEPER_TERMS_VERSION,
            privacy_policy_version=PRIVACY_POLICY_VERSION,
            offer_policy_version=OFFER_POLICY_VERSION,
        )
        return Response(self._payload(acceptance), status=status.HTTP_201_CREATED)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = UserSerializer(request.user).data
        if request.user.role == "customer":
            profile, _ = CustomerProfile.objects.get_or_create(user=request.user)
            data["profile"] = CustomerProfileSerializer(profile).data
        return Response(data)

    def patch(self, request):
        if request.user.role != "customer":
            return Response({"detail": "Only customers have a profile here."}, status=400)
        profile, _ = CustomerProfile.objects.get_or_create(user=request.user)
        for field in [
            "preferred_city", "preferred_area", "last_latitude", "last_longitude",
            "notify_new_nearby_offers", "notify_followed_shops",
            "notify_saved_offer_expiry", "notify_price_drops",
        ]:
            if field in request.data:
                setattr(profile, field, request.data[field])
        profile.save()
        return Response(CustomerProfileSerializer(profile).data)


class GuestSessionView(APIView):
    """GET/PUT a guest's non-sensitive browsing prefs, keyed by a client-side UUID.
    No auth required — this is exactly what section 39 of the product spec asks for."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, guest_id):
        session, _ = GuestSession.objects.get_or_create(guest_id=guest_id)
        return Response(
            {
                "guest_id": session.guest_id,
                "city": session.city,
                "area": session.area,
                "latitude": session.latitude,
                "longitude": session.longitude,
                "recently_viewed_offer_ids": session.recently_viewed_offer_ids,
                "search_history": session.search_history,
            }
        )

    def put(self, request, guest_id):
        session, _ = GuestSession.objects.get_or_create(guest_id=guest_id)
        for field in ["city", "area", "latitude", "longitude", "recently_viewed_offer_ids", "search_history"]:
            if field in request.data:
                setattr(session, field, request.data[field])
        session.save()
        return Response({"status": "saved"})
