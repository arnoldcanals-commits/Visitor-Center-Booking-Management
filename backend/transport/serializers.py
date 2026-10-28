from rest_framework import serializers

from api.models import User
from .models import (
    Transportation,
    Vehicle,
    Location,
    TransportationStop,
    TransportPassenger,
)


# ---------------------------------------------------------------------
# Small nested helpers — used for READ-ONLY embedding on other models
# ---------------------------------------------------------------------

class DriverMinimalSerializer(serializers.ModelSerializer):
    """Lightweight user representation for embedding as `driver`."""

    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'email', 'is_active')


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = '__all__'


class VehicleMinimalSerializer(serializers.ModelSerializer):
    """Lightweight vehicle representation for embedding inside Transportation."""

    driver = DriverMinimalSerializer(read_only=True)

    class Meta:
        model = Vehicle
        fields = (
            'id', 'vehicle_name', 'plate_number', 'capacity',
            'category', 'sub_category', 'status', 'driver', 'is_active'
        )


# ---------------------------------------------------------------------
# Vehicle
# ---------------------------------------------------------------------

class VehicleSerializer(serializers.ModelSerializer):
    # Read: full nested driver object
    driver = DriverMinimalSerializer(read_only=True)
    # Write: pass a plain user id
    driver_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='driver',
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Vehicle
        fields = '__all__'


# ---------------------------------------------------------------------
# TransportationStop
# ---------------------------------------------------------------------

class TransportationStopSerializer(serializers.ModelSerializer):
    # Read: full nested location
    location = LocationSerializer(read_only=True)
    # Write: plain FK id
    location_id = serializers.PrimaryKeyRelatedField(
        queryset=Location.objects.all(),
        source='location',
        write_only=True,
    )

    class Meta:
        model = TransportationStop
        fields = (
            'id',
            'transportation',
            'location',
            'location_id',
            'sequence',
            'expected_arrival',
            'expected_departure',
            'actual_arrival',
            'actual_departure',
            'notes',
        )
        read_only_fields = ('transportation',)


# ---------------------------------------------------------------------
# TransportPassenger
# ---------------------------------------------------------------------

class TransportPassengerSerializer(serializers.ModelSerializer):
    boarding_stop_id = serializers.PrimaryKeyRelatedField(
        queryset=TransportationStop.objects.all(),
        source='boarding_stop',
        write_only=True,
        required=False,
        allow_null=True,
    )
    alighting_stop_id = serializers.PrimaryKeyRelatedField(
        queryset=TransportationStop.objects.all(),
        source='alighting_stop',
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = TransportPassenger
        fields = (
            'id',
            'transportation',
            'name',
            'contact_number',
            'boarding_stop',
            'alighting_stop',
            'boarding_stop_id',
            'alighting_stop_id',
            'status',
            'notes',
        )
        read_only_fields = ('transportation', 'boarding_stop', 'alighting_stop')

    def validate(self, attrs):
        boarding = attrs.get('boarding_stop', getattr(self.instance, 'boarding_stop', None))
        alighting = attrs.get('alighting_stop', getattr(self.instance, 'alighting_stop', None))
        if boarding and alighting and boarding.sequence >= alighting.sequence:
            raise serializers.ValidationError(
                "Alighting stop must come after boarding stop."
            )
        return attrs


# ---------------------------------------------------------------------
# Transportation
# ---------------------------------------------------------------------

class TransportationSerializer(serializers.ModelSerializer):
    # Read: nested objects
    vehicle = VehicleMinimalSerializer(read_only=True)
    driver = DriverMinimalSerializer(read_only=True)
    stops = TransportationStopSerializer(many=True, read_only=True)
    passengers = TransportPassengerSerializer(many=True, read_only=True)

    # Write: plain FK ids
    vehicle_id = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(),
        source='vehicle',
        write_only=True,
        required=False,
        allow_null=True,
    )
    driver_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='driver',
        write_only=True,
        required=False,
        allow_null=True,
    )

    # Derived, read-only — sourced from Vehicle / route / passengers
    owner = serializers.ReadOnlyField()
    affiliate = serializers.ReadOnlyField()
    max_capacity = serializers.ReadOnlyField()
    occupied_seats = serializers.ReadOnlyField()
    available_seats = serializers.ReadOnlyField()

    class Meta:
        model = Transportation
        fields = (
            'id',
            'category',
            'sub_category',
            'categorydesc',
            'title',
            'desc',
            'vehicle',
            'vehicle_id',
            'driver',
            'driver_id',
            'owner',
            'affiliate',
            'max_capacity',
            'occupied_seats',
            'available_seats',
            'actual_departure_time',
            'actual_arrival_time',
            'notes',
            'status',
            'stops',
            'passengers',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')


# ---------------------------------------------------------------------
# Driver-facing status update
#
# A driver assigned to a Transportation (directly via `driver`, or
# implicitly via `vehicle.driver`) can update status/actual times/notes
# only — nothing else. The requesting user is pulled from the request
# context and checked against both, so this can't be used to touch a
# trip the driver isn't on.
# ---------------------------------------------------------------------

class TransportationDriverStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transportation
        fields = (
            'id',
            'status',
            'actual_departure_time',
            'actual_arrival_time',
            'notes',
        )
        read_only_fields = ('id',)

    def validate_status(self, value):
        valid_statuses = dict(Transportation.STATUS_CHOICES)
        if value not in valid_statuses:
            raise serializers.ValidationError(
                f"'{value}' is not a valid status. Choose from: {', '.join(valid_statuses)}."
            )
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        if request is None or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication is required to update this trip.")

        user = request.user
        transportation = self.instance

        is_assigned_driver = transportation.driver_id == user.id
        is_vehicle_driver = (
            transportation.vehicle is not None
            and transportation.vehicle.driver_id == user.id
        )

        if not (is_assigned_driver or is_vehicle_driver):
            raise serializers.ValidationError(
                "You are not the driver assigned to this trip."
            )

        return attrs