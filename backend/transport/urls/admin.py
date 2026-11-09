from django.urls import path

from ..views import ReportCatalogView, ReportRunView
from ..views import (
    AdminReservationListView,
    ApproveReservationView,
    RejectReservationView,
)
from ..views import ReservationListCreateView, SavedGuestsView

# Mount under "api/" in the project urls (same as driver_urls):
#   path("api/", include("<your_app>.reservation_urls")),
urlpatterns = [
    # tourist side
    path("transport-reservations/guests/", SavedGuestsView.as_view(), name="reservation-guests"),
    path("transport-reservations/", ReservationListCreateView.as_view(), name="reservation-list-create"),
    # admin side (Transportation Registry page)
    path("admin-transport/reservations/", AdminReservationListView.as_view(), name="admin-reservation-list"),
    path("admin-transport/reservations/<str:pk>/approve/", ApproveReservationView.as_view(), name="admin-reservation-approve"),
    path("admin-transport/reservations/<str:pk>/reject/", RejectReservationView.as_view(), name="admin-reservation-reject"),
    # admin-only travel reports (Reports page -> Travel)
    path("admin-transport/reports/", ReportCatalogView.as_view(), name="admin-report-catalog"),
    path("admin-transport/reports/<str:key>/", ReportRunView.as_view(), name="admin-report-run"),
]