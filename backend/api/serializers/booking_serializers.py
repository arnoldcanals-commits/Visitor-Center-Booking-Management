from rest_framework import serializers
from django.db import transaction
from django.db.models import Avg
from django.contrib.auth import get_user_model
from django.utils import timezone

from ..models import (
    Booking,
    Guest,
    BookingGuest,
    QRCode,
    TourEvent,
    TourPackage,
    Permit,
    TourEventItinerary,
    Review,
    EventStationCheck,
    EventStationGuestCheck,
    EventStationGuideCheck,
    EventStation,
)

User = get_user_model()

# ============================================================
# QR CODE
# ============================================================
class QRCodeSerializer(serializers.ModelSerializer):
    guest_name = serializers.CharField(
        source="booking_guest.guest.full_name",
        read_only=True
    )

    class Meta:
        model = QRCode
        fields = ["id", "code", "guest_name", "created_at"]
        read_only_fields = fields


# ============================================================
# ASSIGNED TOUR GUIDE
# ============================================================
class AssignedTourGuideSerializer(serializers.ModelSerializer):
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "phone_number",
            "average_rating",
            "review_count",
        ]

    def get_average_rating(self, obj):
        avg = (
            Review.objects.filter(
                booking__assigned_guide=obj,
                target_type="guide",
            )
            .aggregate(avg=Avg("rating"))
            .get("avg")
        )
        return round(avg, 1) if avg else 0.0

    def get_review_count(self, obj):
        return Review.objects.filter(
            booking__assigned_guide=obj,
            target_type="guide",
        ).count()


# ============================================================
# GUEST
# ============================================================
class GuestSerializer(serializers.ModelSerializer):
    id_document_url = serializers.SerializerMethodField()

    class Meta:
        model = Guest
        fields = [
            "id",
            "full_name",
            "age",
            "gender",
            "id_number",
            "local",
            "id_document_url",
        ]
        read_only_fields = fields

    def get_id_document_url(self, obj):
        request = self.context.get("request")
        if obj.id_document:
            return (
                request.build_absolute_uri(obj.id_document.url)
                if request
                else obj.id_document.url
            )
        return None


# ============================================================
# BOOKING GUEST
# ============================================================
class BookingGuestSerializer(serializers.ModelSerializer):
    guest = GuestSerializer(read_only=True)
    qrcode = QRCodeSerializer(read_only=True)

    class Meta:
        model = BookingGuest
        fields = [
            "id",
            "guest",
            "qrcode",
            "created_at",
        ]
        read_only_fields = fields


class BookingGuestCreateSerializer(serializers.ModelSerializer):
    guest = serializers.PrimaryKeyRelatedField(queryset=Guest.objects.all())

    class Meta:
        model = BookingGuest
        fields = ["guest"]


# ============================================================
# TOUR PACKAGE
# ============================================================
class TourPackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TourPackage
        fields = ["id", "name"]


# ============================================================
# ITINERARY
# ============================================================
class TourEventItinerarySerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = TourEventItinerary
        fields = ["id", "file_url", "created_at"]

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file:
            return (
                request.build_absolute_uri(obj.file.url)
                if request
                else obj.file.url
            )
        return None


# ============================================================
# TOUR EVENT
# ============================================================
class TourEventSerializer(serializers.ModelSerializer):
    package = TourPackageSerializer(read_only=True)
    itineraries = TourEventItinerarySerializer(many=True, read_only=True)
    active_itinerary = TourEventItinerarySerializer(read_only=True)
    assigned_guide = AssignedTourGuideSerializer(read_only=True)

    class Meta:
        model = TourEvent
        fields = [
            "id",
            "package",
            "start_date",
            "end_date",
            "itineraries",
            "assigned_guide",
            "active_itinerary",
        ]


# ============================================================
# PERMIT
# ============================================================
class UserPermitSerializer(serializers.ModelSerializer):
    permit_type = serializers.CharField(source="permit_type.name", read_only=True)
    permit_file_url = serializers.SerializerMethodField()

    class Meta:
        model = Permit
        fields = [
            "permit_number",
            "permit_type",
            "issued_date",
            "expiry_date",
            "permit_file_url",
        ]

    def get_permit_file_url(self, obj):
        request = self.context.get("request")
        if obj.generated_file:
            return (
                request.build_absolute_uri(obj.generated_file.url)
                if request
                else obj.generated_file.url
            )
        return None


# ============================================================
# REVIEW
# ============================================================
class ReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(source="reviewer.username", read_only=True)
    package = serializers.PrimaryKeyRelatedField(read_only=True)
    tour_guide = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "booking",
            "target_type",
            "package",
            "tour_guide",
            "rating",
            "comment",
            "reviewer_name",
            "created_at",
        ]
        read_only_fields = ["id", "reviewer_name", "created_at"]

    def create(self, validated_data):
        request = self.context["request"]
        validated_data["reviewer"] = request.user

        booking = validated_data["booking"]
        if validated_data["target_type"] == "package":
            validated_data["package"] = booking.package
        elif validated_data["target_type"] == "guide":
            validated_data["tour_guide"] = booking.assigned_guide

        review = Review(**validated_data)
        review.full_clean()
        review.save()
        return review

    def update(self, instance, validated_data):
        # Keep reviewer, booking, target_type the same
        instance.rating = validated_data.get("rating", instance.rating)
        instance.comment = validated_data.get("comment", instance.comment)

        # Automatically set package or guide from booking
        if instance.target_type == "package":
            instance.package = instance.booking.package
        elif instance.target_type == "guide":
            instance.tour_guide = instance.booking.assigned_guide

        instance.full_clean()
        instance.save()
        return instance


# ============================================================
# EVENT STATION CHECKS
# ============================================================
class EventStationGuestCheckSerializer(serializers.ModelSerializer):
    booking_guest = BookingGuestSerializer(read_only=True)

    class Meta:
        model = EventStationGuestCheck
        fields = [
            "id",
            "booking_guest",
            "checked",
            "checked_by",
            "checked_at",
            "checked_latitude",
            "checked_longitude",
        ]
        read_only_fields = ["id", "checked_by", "checked_at"]


class EventStationGuideCheckSerializer(serializers.ModelSerializer):
    guide = AssignedTourGuideSerializer(read_only=True)

    class Meta:
        model = EventStationGuideCheck
        fields = [
            "id",
            "guide",
            "checked",
            "checked_by",
            "checked_at",
            "checked_location",
        ]
        read_only_fields = ["id", "checked_by", "checked_at"]


class EventStationCheckSerializer(serializers.ModelSerializer):
    guest_checks = EventStationGuestCheckSerializer(many=True, read_only=True)
    guide_check = EventStationGuideCheckSerializer(read_only=True)

    class Meta:
        model = EventStationCheck
        fields = [
            "id",
            "event",
            "station",
            "status",
            "guest_checks",
            "guide_check",
            "checked_at",
            "checked_location",
        ]
        read_only_fields = fields


# ============================================================
# BOOKING
# ============================================================
class BookingSerializer(serializers.ModelSerializer):
    # Read-only
    booking_guests = BookingGuestSerializer(many=True, read_only=True)
    event = TourEventSerializer(read_only=True)
    permit = UserPermitSerializer(read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    itinerary = TourEventItinerarySerializer(read_only=True)
    assigned_guide = AssignedTourGuideSerializer(read_only=True)
    package_name = serializers.CharField(source="package.name", read_only=True)
    event_start_date = serializers.DateField(source="event.start_date", read_only=True)
    event_end_date = serializers.DateField(source="event.end_date", read_only=True)
    can_review = serializers.SerializerMethodField()
    event_station_checks = EventStationCheckSerializer(many=True, read_only=True)

    # Write
    package = serializers.PrimaryKeyRelatedField(queryset=TourPackage.objects.all(), write_only=True)
    guests = BookingGuestCreateSerializer(source="booking_guests", many=True, write_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "package",
            "package_name",
            "event",
            "check_in",
            "check_out",
            "booking_date",
            "status",
            "assigned_guide",
            "itinerary",
            "booking_guests",
            "guests",
            "event_start_date",
            "event_end_date",
            "permit",
            "reviews",
            "can_review",
            "event_station_checks",
        ]
        read_only_fields = [
            "id",
            "event",
            "booking_date",
            "status",
            "assigned_guide",
            "itinerary",
        ]

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        guests_data = validated_data.pop("booking_guests", [])

        booking = Booking.objects.create(
            tourist=request.user,
            **validated_data
        )

        for guest_data in guests_data:
            BookingGuest.objects.create(
                booking=booking,
                **guest_data
            )

        return booking

    def get_can_review(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False

        user = request.user
        if obj.tourist != user:
            return False

        if obj.status != "completed":
            return False

        return not obj.reviews.filter(reviewer=user).exists()
