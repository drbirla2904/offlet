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

from django.db.models import ExpressionWrapper, F, FloatField, Value
from django.db.models.functions import ACos, Cos, Greatest, Least, Radians, Sin
from rest_framework.exceptions import ValidationError

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


def parse_geo_params(params, default_radius=None):
    lat_value, lon_value = params.get("lat"), params.get("lng")
    if lat_value is None and lon_value is None:
        return None, None, None
    if lat_value is None or lon_value is None:
        raise ValidationError({"location": "Both lat and lng are required."})

    try:
        lat, lon = float(lat_value), float(lon_value)
        radius = float(params["radius_km"]) if params.get("radius_km") is not None else default_radius
    except (TypeError, ValueError):
        raise ValidationError({"location": "Coordinates and radius_km must be numbers."}) from None

    if not math.isfinite(lat) or not -90 <= lat <= 90:
        raise ValidationError({"lat": "Latitude must be between -90 and 90."})
    if not math.isfinite(lon) or not -180 <= lon <= 180:
        raise ValidationError({"lng": "Longitude must be between -180 and 180."})
    if radius is not None and (not math.isfinite(radius) or not 0 < radius <= 20000):
        raise ValidationError({"radius_km": "Radius must be greater than 0 and no more than 20000 km."})
    return lat, lon, radius


def distance_expression(lat, lon, lat_field, lon_field):
    target_lat = Radians(Value(lat))
    point_lat = Radians(F(lat_field))
    longitude_delta = Radians(F(lon_field) - Value(lon))
    cosine = Cos(target_lat) * Cos(point_lat) * Cos(longitude_delta) + Sin(target_lat) * Sin(point_lat)
    cosine = Least(Value(1.0), Greatest(Value(-1.0), cosine))
    return ExpressionWrapper(Value(EARTH_RADIUS_KM) * ACos(cosine), output_field=FloatField())
