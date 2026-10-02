import json
import os
from datetime import timedelta
from pathlib import Path

import environ
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(DEBUG=(bool, False))
env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(str(env_file))

DEBUG = env.bool("DEBUG", default=False)
SECRET_KEY = env("DJANGO_SECRET_KEY", default="")
if not SECRET_KEY and DEBUG:
    SECRET_KEY = "local-development-only-insecure-key"
if not SECRET_KEY:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set when DEBUG=False.")
if not DEBUG and len(SECRET_KEY) < 50:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must contain at least 50 characters in production.")

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"] if DEBUG else [])
if not DEBUG and (not ALLOWED_HOSTS or "*" in ALLOWED_HOSTS):
    raise ImproperlyConfigured("Set explicit ALLOWED_HOSTS values when DEBUG=False.")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.humanize",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "accounts",
    "businesses",
    "catalog",
    "offers",
    "engagement",
    "chatapp",
    "notifications",
    "analytics",
    "core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

database_url = env("DATABASE_URL", default="")
if not DEBUG and not database_url:
    raise ImproperlyConfigured("DATABASE_URL must point to PostgreSQL when DEBUG=False.")
if not DEBUG and not database_url.lower().startswith(("postgres://", "postgresql://")):
    raise ImproperlyConfigured("Production DATABASE_URL must use PostgreSQL.")
DATABASES = {
    "default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}")
}
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=60 if not DEBUG else 0)
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = env("TIME_ZONE", default="Asia/Kolkata")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
FILESYSTEM_STORAGE_BACKEND = "django.core.files.storage.FileSystemStorage"
MEDIA_STORAGE_BACKEND = env(
    "MEDIA_STORAGE_BACKEND",
    default=FILESYSTEM_STORAGE_BACKEND if DEBUG else "",
).strip()
if MEDIA_STORAGE_BACKEND.lower() == "filesystem":
    MEDIA_STORAGE_BACKEND = FILESYSTEM_STORAGE_BACKEND
if not MEDIA_STORAGE_BACKEND:
    raise ImproperlyConfigured("Set MEDIA_STORAGE_BACKEND to a Django storage backend in production.")
if not DEBUG and MEDIA_STORAGE_BACKEND == FILESYSTEM_STORAGE_BACKEND:
    raise ImproperlyConfigured("Production media must use shared durable object storage, not local filesystem storage.")

try:
    MEDIA_STORAGE_OPTIONS = json.loads(env("MEDIA_STORAGE_OPTIONS", default="{}"))
except json.JSONDecodeError as exc:
    raise ImproperlyConfigured("MEDIA_STORAGE_OPTIONS must be a JSON object.") from exc
if not isinstance(MEDIA_STORAGE_OPTIONS, dict):
    raise ImproperlyConfigured("MEDIA_STORAGE_OPTIONS must be a JSON object.")

STORAGES = {
    "default": {"BACKEND": MEDIA_STORAGE_BACKEND, "OPTIONS": MEDIA_STORAGE_OPTIONS},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.AllowAny",),
    "DEFAULT_PAGINATION_CLASS": "core.pagination.StandardPagination",
    "DEFAULT_FILTER_BACKENDS": ("django_filters.rest_framework.DjangoFilterBackend",),
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": env("API_ANON_RATE", default="120/minute"),
        "user": env("API_USER_RATE", default="600/minute"),
        "otp_request": env("OTP_REQUEST_RATE", default="3/minute"),
        "otp_verify": env("OTP_VERIFY_RATE", default="10/minute"),
    },
    "NUM_PROXIES": env.int("DRF_NUM_PROXIES", default=1) if not DEBUG else None,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[
    "http://localhost:5173", "http://127.0.0.1:5173",
] if DEBUG else [])
if not DEBUG and any(not origin.startswith("https://") for origin in CORS_ALLOWED_ORIGINS):
    raise ImproperlyConfigured("Production CORS_ALLOWED_ORIGINS must use HTTPS.")
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])
if not DEBUG and any(not origin.startswith("https://") for origin in CSRF_TRUSTED_ORIGINS):
    raise ImproperlyConfigured("Production CSRF_TRUSTED_ORIGINS must use HTTPS.")

SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=not DEBUG)
if not DEBUG and not SECURE_SSL_REDIRECT:
    raise ImproperlyConfigured("SECURE_SSL_REDIRECT must be enabled in production.")
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https") if not DEBUG else None
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000 if not DEBUG else 0)
if not DEBUG and SECURE_HSTS_SECONDS < 1:
    raise ImproperlyConfigured("SECURE_HSTS_SECONDS must be positive in production.")
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=False)
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=False)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

CACHE_URL = env("CACHE_URL", default="redis://127.0.0.1:6379/1" if DEBUG else "")
if not DEBUG and not CACHE_URL.startswith(("redis://", "rediss://")):
    raise ImproperlyConfigured("Set CACHE_URL to a Redis URL when DEBUG=False.")
if DEBUG:
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": CACHE_URL,
            "OPTIONS": {"socket_connect_timeout": 2, "socket_timeout": 2},
        }
    }
PUBLIC_API_CACHE_SECONDS = env.int("PUBLIC_API_CACHE_SECONDS", default=15)
if not 0 <= PUBLIC_API_CACHE_SECONDS <= 300:
    raise ImproperlyConfigured("PUBLIC_API_CACHE_SECONDS must be between 0 and 300.")

# --- Celery (offer expiry / scheduling / notifications) -------------------
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://localhost:6379/0" if DEBUG else "")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default=CELERY_BROKER_URL)
if not DEBUG and not CELERY_BROKER_URL.startswith(("redis://", "rediss://")):
    raise ImproperlyConfigured("Set CELERY_BROKER_URL to Redis when DEBUG=False.")
CELERY_BEAT_SCHEDULE = {
    "activate-scheduled-offers": {
        "task": "offers.tasks.activate_scheduled_offers",
        "schedule": 60.0,
    },
    "expire-ended-offers": {
        "task": "offers.tasks.expire_ended_offers",
        "schedule": 60.0,
    },
    "notify-low-stock": {
        "task": "offers.tasks.notify_low_stock",
        "schedule": 300.0,
    },
    "notify-expiring-saved-offers": {
        "task": "notifications.tasks.notify_expiring_saved_offers",
        "schedule": 3600.0,
    },
}

FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:5173")
if not DEBUG and not FRONTEND_URL.startswith("https://"):
    raise ImproperlyConfigured("Set FRONTEND_URL to the public HTTPS frontend origin in production.")

SMS_BACKEND = env("SMS_BACKEND", default="accounts.otp.console_sms_backend" if DEBUG else "")
if not DEBUG and not SMS_BACKEND:
    raise ImproperlyConfigured("Set SMS_BACKEND to a production SMS provider adapter.")
if not DEBUG and SMS_BACKEND == "accounts.otp.console_sms_backend":
    raise ImproperlyConfigured("The development console SMS backend cannot be used in production.")

# Without this, accounts.otp's send_sms() log line (the dev-time stand-in for
# a real SMS gateway) is silently dropped — Django's implicit default logging
# only surfaces WARNING+ on the console.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {
        "accounts": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
