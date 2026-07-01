# serializers/guest.py
from rest_framework import serializers
from api.models import Guest, BookingGuest


# =====================================================
# Guest (Saved Guest List)
# =====================================================
class GuestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guest
        fields = [
            "id",
            "full_name",
            "age",
            "gender",
            "id_number",
            "id_document",
            "local",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        """
        Force ownership to the logged-in tourist.
        """
        request = self.context.get("request")
        if not request or not request.user:
            raise serializers.ValidationError(
                "Request context with authenticated user is required."
            )

        validated_data["owner"] = request.user
        return super().create(validated_data)

    def validate(self, attrs):
        request = self.context.get("request")

        if not request or not request.user:
            raise serializers.ValidationError(
                "Authentication required."
            )

        if request.user.role != "tourist":
            raise serializers.ValidationError(
                "Only tourists can manage personal guests."
            )

        # Prevent editing someone else's guest
        if self.instance and self.instance.owner != request.user:
            raise serializers.ValidationError(
                "You do not own this guest."
            )

        return attrs


# =====================================================
# Guest Booking History (Read-only)
# =====================================================
class GuestBookingHistorySerializer(serializers.ModelSerializer):
    booking_id = serializers.IntegerField(source="booking.id")
    package_name = serializers.CharField(
        source="booking.package.name",
        allow_null=True
    )
    event_dates = serializers.SerializerMethodField()
    status = serializers.CharField(source="booking.status")

    class Meta:
        model = BookingGuest
        fields = [
            "booking_id",
            "package_name",
            "event_dates",
            "status",
            "created_at",
        ]

    def get_event_dates(self, obj):
        event = obj.booking.event
        if event:
            return {
                "start": event.start_date,
                "end": event.end_date,
            }
        return None


# =====================================================
# Guest Detail (includes history)
# =====================================================
class GuestDetailSerializer(GuestSerializer):
    history = serializers.SerializerMethodField()

    class Meta(GuestSerializer.Meta):
        fields = GuestSerializer.Meta.fields + ["history"]

    def get_history(self, guest):
        qs = guest.booking_instances.select_related(
            "booking__package",
            "booking__event"
        ).order_by("-created_at")

        return GuestBookingHistorySerializer(qs, many=True).data
