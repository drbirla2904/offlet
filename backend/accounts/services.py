def migrate_guest_session(guest_id, customer_profile):
    """When a guest registers, carry their non-sensitive browsing prefs
    (city/area/location/recently-viewed) into their new account."""
    from .models import GuestSession

    try:
        session = GuestSession.objects.get(guest_id=guest_id)
    except GuestSession.DoesNotExist:
        return
    customer_profile.preferred_city = session.city or customer_profile.preferred_city
    customer_profile.preferred_area = session.area or customer_profile.preferred_area
    customer_profile.last_latitude = session.latitude or customer_profile.last_latitude
    customer_profile.last_longitude = session.longitude or customer_profile.last_longitude
    customer_profile.save()
