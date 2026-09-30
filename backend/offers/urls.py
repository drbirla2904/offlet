from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("offers", views.OfferViewSet, basename="offer")

urlpatterns = router.urls
