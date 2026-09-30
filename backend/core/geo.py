"""
Lightweight geo helpers for MVP scale.

For MVP we filter/sort by distance in Python using the haversine formula
after a cheap bounding-box pre-filter in SQL (so the DB does most of the
work and only nearby rows are pulled into memory). This works fine up to
tens of thousands of active offers.

When the catalog grows past that, swap this module for PostGIS
(GeoDjango's PointField + `annotate(distance=Distance(...))`) without
changing any call sites — everything here is called by field name, not
by ORM internals.
"""
import math

EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1, lon1, lat2, lon2):
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c


def bounding_box(lat, lon, radius_km):
    """Return (lat_min, lat_max, lon_min, lon_max) for a cheap SQL pre-filter."""
    lat_delta = radius_km / 111.0  # ~111km per degree latitude
    lon_delta = radius_km / (111.0 * max(math.cos(math.radians(lat)), 0.01))
    return (lat - lat_delta, lat + lat_delta, lon - lon_delta, lon + lon_delta)
