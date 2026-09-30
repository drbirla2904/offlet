from django.urls import path

from . import views

urlpatterns = [
    path("dashboard/", views.ShopkeeperDashboardView.as_view(), name="shopkeeper-dashboard"),
]
