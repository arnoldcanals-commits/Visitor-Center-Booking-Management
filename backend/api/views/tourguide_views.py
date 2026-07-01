# api/views/tourguide_views.py

from rest_framework import generics, permissions
from django.db.models import Count, Q, Prefetch

from api.models import (
    Review,
    Booking,
    TourEvent,
    EventStationCheck,
    EventStationGuestCheck,
)

from api.serializers import (
    TourGuideProfileSerializer,
    TourGuideStatusSerializer,
    TourGuideReviewSerializer,
    GuideBookingSerializer,
    GuideEventSerializer,
    GuideEventListSerializer,
    GuideEventDetailSerializer,
)


# =====================================================
# Permissions
# =====================================================
class IsTourGuide(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "tour_guide"
        )


# =====================================================
# Profile (Self)
# =====================================================
class TourGuideProfileView(generics.RetrieveUpdateAPIView):
    """
    GET   -> View own profile
    PATCH -> Update allowed profile fields
    """
    permission_classes = [permissions.IsAuthenticated, IsTourGuide]
    serializer_class = TourGuideProfileSerializer

    def get_object(self):
        return self.request.user


class TourGuideStatusUpdateView(generics.UpdateAPIView):
    """
    PATCH -> Update availability / status only
    """
    permission_classes = [permissions.IsAuthenticated, IsTourGuide]
    serializer_class = TourGuideStatusSerializer

    def get_object(self):
        return self.request.user


# =====================================================
# Reviews (Read-only)
# =====================================================
class TourGuideReviewListView(generics.ListAPIView):
    """
    Reviews written about the authenticated tour guide
    """
    permission_classes = [permissions.IsAuthenticated, IsTourGuide]
    serializer_class = TourGuideReviewSerializer

    def get_queryset(self):
        return (
            Review.objects
            .filter(tour_guide=self.request.user)
            .select_related("reviewer")
            .order_by("-created_at")
        )


# =====================================================
# Bookings (via assigned events)
# =====================================================
class GuideBookingListView(generics.ListAPIView):
    """
    Read-only list of bookings under events assigned to this guide
    """
    permission_classes = [permissions.IsAuthenticated, IsTourGuide]
    serializer_class = GuideBookingSerializer

    def get_queryset(self):
        return (
            Booking.objects
            .filter(event__assigned_guide=self.request.user)
            .select_related(
                "tourist",
                "event",
                "event__package",
            )
            .prefetch_related(
                "booking_guests__guest"
            )
            .order_by("-created_at")
        )


# =====================================================
# Events (List Views)
# =====================================================
class GuideEventListView(generics.ListAPIView):
    """
    Compact event list with station completion summary
    """
    permission_classes = [permissions.IsAuthenticated, IsTourGuide]
    serializer_class = GuideEventListSerializer

    def get_queryset(self):
        return (
            TourEvent.objects
            .filter(assigned_guide=self.request.user)
            .annotate(
                completed_stations=Count(
                    "station_checks",
                    filter=Q(station_checks__status="complete"),
                    distinct=True,
                ),
                total_stations=Count(
                    "station_checks",
                    distinct=True,
                ),
            )
            .select_related("package")
            .order_by("-start_date")
        )


class GuideEventSummaryView(generics.ListAPIView):
    """
    Aggregated event overview (slots, bookings count)
    """
    permission_classes = [permissions.IsAuthenticated, IsTourGuide]
    serializer_class = GuideEventSerializer

    def get_queryset(self):
        return (
            TourEvent.objects
            .filter(assigned_guide=self.request.user)
            .annotate(
                total_bookings=Count("bookings", distinct=True)
            )
            .select_related("package")
            .order_by("-start_date")
        )


# =====================================================
# Event Detail (Read-only deep view)
# =====================================================
class GuideEventDetailView(generics.RetrieveAPIView):
    """
    Full event detail for tour guides (READ-ONLY):

    - Bookings
    - Booking guests
    - Stations
    - Station guest checks (tracked, not editable)
    """
    permission_classes = [permissions.IsAuthenticated, IsTourGuide]
    serializer_class = GuideEventDetailSerializer
    lookup_field = "id"

    def get_queryset(self):
        return (
            TourEvent.objects
            .filter(assigned_guide=self.request.user)
            .select_related(
                "package",
                "active_itinerary",
            )
            .prefetch_related(
                # ---------------------------------------------
                # Bookings + guests
                # ---------------------------------------------
                Prefetch(
                    "bookings",
                    queryset=Booking.objects
                    .select_related("tourist")
                    .prefetch_related(
                        "booking_guests__guest"
                    ),
                ),

                # ---------------------------------------------
                # Station checks + guest checks (READ-ONLY)
                # ---------------------------------------------
                Prefetch(
                    "station_checks",
                    queryset=EventStationCheck.objects
                    .select_related(
                        "station",
                        "guide_check__checked_by",
                    )
                    .prefetch_related(
                        Prefetch(
                            "guest_checks",
                            queryset=EventStationGuestCheck.objects
                            .select_related(
                                "booking_guest__guest",
                                "checked_by",
                            )
                        )
                    )
                    .order_by("station__id"),
                ),
            )
        )
