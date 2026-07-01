from rest_framework.generics import ListAPIView, UpdateAPIView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction

from ..models import (
    EventStationCheck,
    EventStationGuestCheck,
    EventStationGuideCheck,
    QRCode,
    Station,
    TourEvent,
    BookingGuest,
)
from ..serializers import (
    StationEventOverviewSerializer,
    EventStationCheckReadSerializer,
    AssignedStationSerializer,
    EventStationGuestCheckUpdateSerializer,
    EventStationGuideCheckUpdateSerializer,
)
from ..permissions import IsStationStaff


# ========================
# Station Dashboard
# ========================
class StationDashboardView(ListAPIView):
    """
    Shows active + past events assigned to the station staff
    """
    serializer_class = StationEventOverviewSerializer
    permission_classes = [IsAuthenticated, IsStationStaff]

    def get_queryset(self):
        return (
            TourEvent.objects
            .filter(station_checks__station__staff=self.request.user)
            .select_related("package", "assigned_guide")
            .prefetch_related(
                "bookings__booking_guests__guest",  # BookingGuest → Guest
                "station_checks__guest_checks__booking_guest__guest",
                "station_checks__guide_check",
            )
            .distinct()
        )


# ========================
# Station QR Scan
# ========================
class StationQRScanView(APIView):
    permission_classes = [IsAuthenticated, IsStationStaff]

    @transaction.atomic
    def post(self, request):
        code = request.data.get("code")
        lat = request.data.get("checked_latitude")
        lng = request.data.get("checked_longitude")

        if not code:
            return Response(
                {"detail": "QR code is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1. Identify the staff's station
        station = Station.objects.filter(staff=request.user).first()
        if not station:
            return Response(
                {"detail": "You are not assigned to any station."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 2. Find the QR and the associated Event
        qr = (
            QRCode.objects
            .select_related("booking_guest__booking__event", "booking_guest__booking__assigned_guide")
            .filter(code=code)
            .first()
        )

        if not qr or not qr.booking_guest:
            return Response(
                {"detail": "Invalid QR code."},
                status=status.HTTP_404_NOT_FOUND,
            )

        booking_guest = qr.booking_guest
        booking = booking_guest.booking
        event = booking.event

        if not event:
            return Response(
                {"detail": "QR code is not linked to an event."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3. FIX: Create the Station Check record if it doesn't exist yet
        # This "opens" the event at this station upon the first scan.
        station_check, created = EventStationCheck.objects.get_or_create(
            event=event,
            station=station,
            defaults={
                'status': 'active',
                'checked_location': f"{lat},{lng}" if lat and lng else ""
            }
        )

        # 4. Ensure Guide Check row exists for this station/event
        if event.assigned_guide:
            EventStationGuideCheck.objects.get_or_create(
                event_station_check=station_check,
                guide=event.assigned_guide,
            )

        # 5. Populate ALL guests from this event into this station's list
        # We do this so the staff can see/check the rest of the group manually.
        all_event_guests = BookingGuest.objects.filter(
            booking__event=event
        ).select_related("guest")

        for bg in all_event_guests:
            EventStationGuestCheck.objects.get_or_create(
                event_station_check=station_check,
                booking_guest=bg,
            )

        # 6. Mark the scanned guest as checked-in
        current_guest_check = EventStationGuestCheck.objects.get(
            event_station_check=station_check,
            booking_guest=booking_guest,
        )

        if not current_guest_check.checked:
            current_guest_check.checked = True
            current_guest_check.checked_at = timezone.now()
            current_guest_check.checked_by = request.user
            current_guest_check.checked_latitude = lat
            current_guest_check.checked_longitude = lng
            current_guest_check.save()

        # 7. Return the full station check data for the frontend modal
        serializer = EventStationCheckReadSerializer(
            station_check,
            context={"request": request}
        )

        return Response(serializer.data, status=status.HTTP_200_OK)

# ========================
# My Station
# ========================
class MyStationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "station_staff":
            return Response({"detail": "User is not station staff."}, status=status.HTTP_403_FORBIDDEN)

        station = Station.objects.filter(staff=request.user).first()
        if not station:
            return Response({"detail": "You are not assigned to any station."}, status=status.HTTP_403_FORBIDDEN)

        serializer = AssignedStationSerializer(station)
        return Response(serializer.data)


# ========================
# Update Guest Check (Scan)
# ========================
class EventStationGuestCheckUpdateView(UpdateAPIView):
    serializer_class = EventStationGuestCheckUpdateSerializer
    permission_classes = [IsAuthenticated, IsStationStaff]

    def get_queryset(self):
        station = Station.objects.filter(staff=self.request.user).first()

        if not station:
            return EventStationGuestCheck.objects.none()

        return EventStationGuestCheck.objects.filter(
            event_station_check__station=station
        ).select_related(
            "event_station_check__event",
            "booking_guest__booking__event",
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


# ========================
# Update Guide Check (Scan)
# ========================
class EventStationGuideCheckUpdateView(UpdateAPIView):
    serializer_class = EventStationGuideCheckUpdateSerializer
    permission_classes = [IsAuthenticated, IsStationStaff]

    def get_queryset(self):
        station = Station.objects.filter(staff=self.request.user).first()

        if not station:
            return EventStationGuideCheck.objects.none()

        return EventStationGuideCheck.objects.filter(
            event_station_check__station=station
        ).select_related(
            "event_station_check__event"
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context
