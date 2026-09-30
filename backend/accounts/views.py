from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from core.choices import UserRole

from . import otp as otp_lib
from .models import CustomerProfile, GuestSession, User
from .serializers import (
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
    """POST {phone_number, otp, role?, username?, guest_id?} -> verifies the
    code, creating the account on first sign-in for that number, and returns
    JWTs exactly like the old email/password login did."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        phone_number = otp_lib.normalize_phone_number(data["phone_number"])
        otp_lib.verify_otp(phone_number, data["otp"])

        user, created = User.objects.get_or_create(
            phone_number=phone_number,
            defaults={
                "username": data.get("username") or phone_number,
                "role": data.get("role", UserRole.CUSTOMER),
            },
        )
        if created:
            user.is_phone_verified = True
            user.save(update_fields=["is_phone_verified"])
            if user.role == UserRole.CUSTOMER:
                profile = CustomerProfile.objects.create(user=user)
                guest_id = data.get("guest_id")
                if guest_id:
                    from .services import migrate_guest_session

                    migrate_guest_session(guest_id, profile)
        elif not user.is_phone_verified:
            # Covers an account created some other way (e.g. via Django
            # admin) that hadn't verified its phone yet.
            user.is_phone_verified = True
            user.save(update_fields=["is_phone_verified"])

        return Response(
            {"user": UserSerializer(user).data, "tokens": _tokens_for(user), "created": created},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


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
