from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from core.health import live, ready

urlpatterns = [
    path("health/live/", live, name="health-live"),
    path("health/ready/", ready, name="health-ready"),
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("catalog.urls")),
    path("api/", include("businesses.urls")),
    path("api/", include("offers.urls")),
    path("api/", include("engagement.urls")),
    path("api/", include("chatapp.urls")),
    path("api/", include("notifications.urls")),
    path("api/analytics/", include("analytics.urls")),
]

if settings.DEBUG and settings.MEDIA_STORAGE_BACKEND == settings.FILESYSTEM_STORAGE_BACKEND:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
