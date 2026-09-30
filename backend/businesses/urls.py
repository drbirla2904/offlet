from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("businesses", views.BusinessViewSet, basename="business")

urlpatterns = router.urls
