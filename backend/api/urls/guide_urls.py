from django.urls import path
from api.views.tourguide_views import (
    TourGuideProfileView,
    TourGuideStatusUpdateView,
    TourGuideReviewListView,
    GuideBookingListView,
    GuideEventListView,
    GuideEventSummaryView,
    GuideEventDetailView,
)


urlpatterns = [
    # -----------------------------
    # Profile
    # -----------------------------
    path("profile/", TourGuideProfileView.as_view(), name="profile"),
    path("profile/status/", TourGuideStatusUpdateView.as_view(), name="update-status"),

    # -----------------------------
    # Reviews
    # -----------------------------
    path("reviews/", TourGuideReviewListView.as_view(), name="reviews"),

    # -----------------------------
    # Bookings
    # -----------------------------
    path("bookings/", GuideBookingListView.as_view(), name="bookings"),

    # -----------------------------
    # Events
    # -----------------------------
    path("events/", GuideEventListView.as_view(), name="events-list"),
    path("events/summary/", GuideEventSummaryView.as_view(), name="events-summary"),
    path("events/<int:id>/", GuideEventDetailView.as_view(), name="events-detail"),
]
