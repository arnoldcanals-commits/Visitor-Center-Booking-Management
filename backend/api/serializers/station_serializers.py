from rest_framework import serializers
from django.utils import timezone

from ..models import (
    Booking,
    BookingGuest,
    TourEvent,
    EventStationCheck,
    EventStationGuestCheck,
    EventStationGuideCheck,
    Station,
)

# =====================
# STATION SERIALIZERS
# =====================
class AssignedStationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Station
        fields = ["id", "name", "description", "location"]


class StationGuestSerializer(serializers.ModelSerializer):
    """Serialize the guest info from BookingGuest"""
    full_name = serializers.CharField(source="guest.full_name")
    age = serializers.IntegerField(source="guest.age")
    id_number = serializers.CharField(source="guest.id_number")
    created_at = serializers.DateTimeField(source="guest.created_at")

    class Meta:
        model = BookingGuest
        fields = ["id", "full_name", "age", "id_number", "created_at"]


class StationBookingSerializer(serializers.ModelSerializer):
    guests = serializers.SerializerMethodField()
    tourist_name = serializers.CharField(source="tourist.username", read_only=True)
    guide_name = serializers.SerializerMethodField()
    package_name = serializers.CharField(source="package.name", read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "status",
            "check_in",
            "check_out",
            "tourist_name",
            "guide_name",
            "package_name",
            "guests",
        ]

    def get_guests(self, obj):
        return StationGuestSerializer(obj.booking_guests.all(), many=True).data

    def get_guide_name(self, obj):
        return obj.assigned_guide.get_full_name() if obj.assigned_guide else None


class StationEventOverviewSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source="package.name", read_only=True)
    guide_name = serializers.SerializerMethodField()
    bookings = StationBookingSerializer(many=True, read_only=True)

    class Meta:
        model = TourEvent
        fields = [
            "id",
            "start_date",
            "end_date",
            "package_name",
            "guide_name",
            "bookings",
        ]

    def get_guide_name(self, obj):
        return obj.assigned_guide.get_full_name() if obj.assigned_guide else None


# =====================
# QR SCAN / STATION CHECK
# =====================
class EventStationGuestCheckSerializer(serializers.ModelSerializer):
    guest_name = serializers.CharField(
        source="booking_guest.guest.full_name",
        read_only=True
    )
    booking = serializers.SerializerMethodField()
    coordinates = serializers.SerializerMethodField()

    class Meta:
        model = EventStationGuestCheck
        fields = [
            "id",
            "booking_guest",
            "guest_name",
            "checked",
            "checked_at",
            "checked_latitude",
            "checked_longitude",
            "coordinates",
            "booking",
        ]
        read_only_fields = [
            "id",
            "booking_guest",
            "checked",
            "checked_at",
            "booking",
        ]

    def get_booking(self, obj):
        """
        STRICT: Only return booking if it belongs
        to the same event as this station check.
        """
        booking = obj.booking_guest.booking
        station_event = obj.event_station_check.event

        if booking.event_id != station_event.id:
            return None  # hard stop if mismatch

        return StationBookingSerializer(booking).data

    def get_coordinates(self, obj):
        if obj.checked_latitude and obj.checked_longitude:
            return {
                "lat": float(obj.checked_latitude),
                "lng": float(obj.checked_longitude),
            }
        return None


class EventStationGuestCheckUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = EventStationGuestCheck
        fields = ["checked_latitude", "checked_longitude"]

    def update(self, instance, validated_data):
        if instance.checked:
            raise serializers.ValidationError("Guest already checked.")

        # 🔥 HARD EVENT VALIDATION
        booking_event = instance.booking_guest.booking.event
        station_event = instance.event_station_check.event

        if booking_event_id := booking_event.id != station_event.id:
            raise serializers.ValidationError(
                "Guest does not belong to this event."
            )

        request = self.context.get("request")

        instance.checked = True
        instance.checked_at = timezone.now()
        instance.checked_by = request.user if request else None
        instance.checked_latitude = validated_data.get("checked_latitude")
        instance.checked_longitude = validated_data.get("checked_longitude")
        instance.save()

        return instance


class EventStationGuideCheckSerializer(serializers.ModelSerializer):
    guide_name = serializers.SerializerMethodField()

    class Meta:
        model = EventStationGuideCheck
        fields = [
            "id",
            "guide",
            "guide_name",
            "checked",
            "checked_at",
            "checked_location",
        ]
        read_only_fields = [
            "id",
            "guide",
            "checked",
            "checked_at",
        ]

    def get_guide_name(self, obj):
        return obj.guide.get_full_name() if obj.guide else None


class EventStationGuideCheckUpdateSerializer(serializers.ModelSerializer):
    """Used for scanning/checking a guide"""
    checked_location = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=True
    )

    class Meta:
        model = EventStationGuideCheck
        fields = ["checked_location"]

    def update(self, instance, validated_data):
        if instance.checked:
            raise serializers.ValidationError("Guide already checked.")

        request = self.context.get("request")

        instance.checked = True
        instance.checked_at = timezone.now()
        instance.checked_by = request.user if request else None
        instance.checked_location = validated_data.get(
            "checked_location",
            instance.checked_location
        )
        instance.save()
        return instance


class EventStationCheckReadSerializer(serializers.ModelSerializer):
    station = AssignedStationSerializer(read_only=True)
    guest_checks = serializers.SerializerMethodField()
    guide_check = EventStationGuideCheckSerializer(read_only=True)
    event = serializers.SerializerMethodField()

    class Meta:
        model = EventStationCheck
        fields = [
            "id",
            "station",
            "status",
            "checked_at",
            "checked_location",
            "guest_checks",
            "guide_check",
            "event",
        ]

    def get_guest_checks(self, obj):
        """
        STRICT: Only include guest checks where
        booking_guest.booking.event == this event.
        """

        return EventStationGuestCheckSerializer(
            obj.guest_checks.filter(
                booking_guest__booking__event=obj.event
            ).select_related("booking_guest__guest"),
            many=True,
        ).data

    def get_event(self, obj):
        event = obj.event

        return {
            "id": event.id,
            "start_date": event.start_date,
            "end_date": event.end_date,
            "package_name": event.package.name if event.package else None,
            "guide_name": (
                event.assigned_guide.get_full_name()
                if event.assigned_guide else None
            ),
            "bookings": StationBookingSerializer(
                event.bookings.filter(
                    status__in=["approved", "active"]
                ),
                many=True,
            ).data,
        }


# =====================
# HISTORY
# =====================
class GuestEventHistorySerializer(serializers.ModelSerializer):
    station_name = serializers.CharField(source="event_station_check.station.name", read_only=True)
    guest_name = serializers.CharField(source="booking_guest.guest.full_name", read_only=True)

    class Meta:
        model = EventStationGuestCheck
        fields = [
            "station_name",
            "guest_name",
            "checked",
            "checked_at",
            "checked_location",
        ]
