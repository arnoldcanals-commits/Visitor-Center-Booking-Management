# tourguide_serializers.py
from rest_framework import serializers
from django.db.models import Prefetch

from api.models import (
    User,
    Qualification,
    Review,
    Booking,
    TourPackage,
    TourEvent,
    Guest,
    EventStationCheck,
    EventStationGuestCheck,
)

# =====================================================
# Qualifications
# =====================================================
class QualificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Qualification
        fields = ["id", "name", "description"]


# =====================================================
# Base Tour Guide Serializer
# =====================================================
class TourGuideBaseSerializer(serializers.ModelSerializer):
    qualifications = QualificationSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "phone_number",
            "status",
            "qualifications",
        ]


# =====================================================
# Tour Guide Profile (Self)
# =====================================================
class TourGuideProfileSerializer(TourGuideBaseSerializer):
    class Meta(TourGuideBaseSerializer.Meta):
        read_only_fields = ["id", "username", "email", "qualifications"]

    def validate_status(self, value):
        if value not in ["available", "busy", "on_leave"]:
            raise serializers.ValidationError("Invalid guide status.")
        return value


# =====================================================
# Status-Only Update
# =====================================================
class TourGuideStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["status"]

    def validate_status(self, value):
        if value not in ["available", "busy", "on_leave"]:
            raise serializers.ValidationError("Invalid status.")
        return value


# =====================================================
# Reviews (Read-only)
# =====================================================
class ReviewerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]


class TourGuideReviewSerializer(serializers.ModelSerializer):
    reviewer = ReviewerSerializer(read_only=True)

    class Meta:
        model = Review
        fields = ["id", "rating", "comment", "created_at", "reviewer"]


# =====================================================
# Bookings (Assigned to Guide)
# =====================================================
class TourPackageLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TourPackage
        fields = ["id", "name"]


class TourEventLiteSerializer(serializers.ModelSerializer):
    package = TourPackageLiteSerializer(read_only=True)

    class Meta:
        model = TourEvent
        fields = ["id", "package", "start_date", "end_date", "is_group_event"]


class GuideBookingSerializer(serializers.ModelSerializer):
    event = TourEventLiteSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "status",
            "check_in",
            "check_out",
            "event",
            "created_at",
        ]


# =====================================================
# Guests
# =====================================================
class GuideGuestSerializer(serializers.ModelSerializer):
    # Add these fields to the guest object
    checked_latitude = serializers.SerializerMethodField()
    checked_longitude = serializers.SerializerMethodField()

    class Meta:
        model = Guest
        fields = [
            "id", "full_name", "age", "id_number", "created_at", "gender",
            "checked_latitude", "checked_longitude" # Now included!
        ]

    def get_checked_latitude(self, obj):
        # We look for the most recent check-in for this guest
        # Note: We access this via the BookingGuest bridge
        latest_check = EventStationGuestCheck.objects.filter(
            booking_guest__guest=obj, 
            checked=True
        ).order_by('-checked_at').first()
        return latest_check.checked_latitude if latest_check else None

    def get_checked_longitude(self, obj):
        latest_check = EventStationGuestCheck.objects.filter(
            booking_guest__guest=obj, 
            checked=True
        ).order_by('-checked_at').first()
        return latest_check.checked_longitude if latest_check else None

class GuideBookingDetailSerializer(serializers.ModelSerializer):
    guests = GuideGuestSerializer(many=True, read_only=True)
    tourist_name = serializers.CharField(source="tourist.username", read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "status",
            "tourist_name",
            "check_in",
            "check_out",
            "created_at",
            "guests",
        ]


# =====================================================
# Guest Check (READ-ONLY)
# =====================================================
class GuideGuestCheckSerializer(serializers.ModelSerializer):
    guest_id = serializers.IntegerField(
        source="booking_guest.guest.id", read_only=True
    )
    guest_name = serializers.CharField(
        source="booking_guest.guest.full_name", read_only=True
    )
    gender = serializers.CharField(
        source="booking_guest.guest.gender", read_only=True
    )
    checked_by_name = serializers.CharField(
        source="checked_by.username", read_only=True
    )

    
    class Meta:
        model = EventStationGuestCheck
        fields = [
            "guest_id",
            "guest_name",
            "checked",
            "checked_at",
           "checked_latitude", 
            "checked_longitude",
            "checked_by_name",
            "gender"
        ]


# =====================================================
# Station Progress
# =====================================================
class GuideStationProgressSerializer(serializers.ModelSerializer):
    station_id = serializers.IntegerField(source="station.id", read_only=True)
    station_name = serializers.CharField(source="station.name", read_only=True)

    guest_checks = GuideGuestCheckSerializer(many=True, read_only=True)
    guide_check_status = serializers.SerializerMethodField()

    class Meta:
        model = EventStationCheck
        fields = [
            "station_id",
            "station_name",
            "status",
            "checked_at",
            "guest_checks",
            "guide_check_status",
        ]

    def get_guide_check_status(self, obj):
        guide_check = getattr(obj, "guide_check", None)
        if not guide_check:
            return None

        return {
            "checked": guide_check.checked,
            "checked_at": guide_check.checked_at,
            "checked_location": guide_check.checked_location,
            "checked_by_name": (
                guide_check.checked_by.username
                if guide_check.checked_by
                else None
            ),
        }


class GuideEventSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(
        source="package.name",
        read_only=True
    )

    slots_used = serializers.IntegerField(read_only=True)
    slots_available = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)

    total_bookings = serializers.IntegerField(read_only=True)

    class Meta:
        model = TourEvent
        fields = [
            "id",
            "package_name",
            "start_date",
            "end_date",
            "slot_limit",
            "slots_used",
            "slots_available",
            "is_full",
            "total_bookings",
            "is_group_event",
            "requires_permit",
        ]
        read_only_fields = fields
# =====================================================
# Event Detail
# =====================================================
class GuideEventDetailSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source="package.name", read_only=True)
    itinerary_id = serializers.IntegerField(
        source="active_itinerary.id", read_only=True
    )
    itinerary_file = serializers.FileField(
        source="active_itinerary.file", read_only=True
    )

    bookings = GuideBookingDetailSerializer(many=True, read_only=True)
    stations_progress = serializers.SerializerMethodField()

    class Meta:
        model = TourEvent
        fields = [
            "id",
            "package_name",
            "start_date",
            "end_date",
            "is_group_event",
            "slot_limit",
            "slots_used",
            "itinerary_id",
            "itinerary_file",
            "bookings",
            "stations_progress",
        ]

    def get_stations_progress(self, obj):
        checks = obj.station_checks.select_related(
            "station",
            "checked_by",
            "guide_check__checked_by"
        ).prefetch_related(
            "guest_checks__booking_guest__guest",
            "guest_checks__checked_by"
        ).order_by("station__id")

        return GuideStationProgressSerializer(checks, many=True).data


# =====================================================
# Event List (Aggregated)
# =====================================================
class GuideEventListSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source="package.name", read_only=True)
    completed_stations = serializers.SerializerMethodField()
    total_stations = serializers.SerializerMethodField()

    class Meta:
        model = TourEvent
        fields = [
            "id",
            "package_name",
            "start_date",
            "end_date",
            "completed_stations",
            "total_stations",
        ]

    def get_completed_stations(self, obj):
        return obj.station_checks.filter(status="complete").count()

    def get_total_stations(self, obj):
        return obj.stations.count()
