# api/urls/staff_auth_urls.py
from django.urls import path
from api.views.staff_auth_views import (
    StaffTokenObtainPairView,
    StaffTokenRefreshView,
    StaffMeView,
)

urlpatterns = [
    path("token/", StaffTokenObtainPairView.as_view(), name="staff-token"),
    path("token/refresh/", StaffTokenRefreshView.as_view(), name="staff-token-refresh"),
    path("me/", StaffMeView.as_view(), name="staff-me"),
]
