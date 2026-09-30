from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("favorites", views.FavoriteOfferViewSet, basename="favorite")
router.register("follows", views.FollowBusinessViewSet, basename="follow")
router.register("reviews", views.ReviewViewSet, basename="review")
router.register("reports", views.OfferReportViewSet, basename="report")

urlpatterns = router.urls
