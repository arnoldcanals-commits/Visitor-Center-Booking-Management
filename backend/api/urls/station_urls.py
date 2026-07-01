from django.urls import path
from api.views.station_views import *

urlpatterns = [
    path("me/", MyStationView.as_view(), name="station-me"),
    path("dashboard/", StationDashboardView.as_view()),
    path("scan/", StationQRScanView.as_view()),
    path("guest-check/<int:pk>/", EventStationGuestCheckUpdateView.as_view(), name="station-guest-check"),
    path("guide-check/<int:pk>/", EventStationGuideCheckUpdateView.as_view(), name="station-guide-check"),

]
