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

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Location, Transportation, TransportationStop, TransportPassenger, Vehicle

User = get_user_model()

# Passengers that still count against the trip (not cancelled / no-show).
LIVE_STATUSES = ("reserved", "checked_in", "completed")


# ----------------------------------------------------------------------
# Small building blocks
# ----------------------------------------------------------------------
class DriverLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ["id", "name", "latitude", "longitude", "address"]


class DriverVehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = [
            "id",
            "vehicle_name",
            "plate_number",
            "capacity",
            "status",
            "title",
            "category",
            "sub_category",
            "owner",
            "affiliate",
        ]


class DriverStopBriefSerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source="location.name", read_only=True)

    class Meta:
        model = TransportationStop
        fields = ["id", "sequence", "location_name", "expected_arrival", "expected_departure"]


# ----------------------------------------------------------------------
# Profile
# ----------------------------------------------------------------------
class DriverProfileSerializer(serializers.Serializer):
    """
    Plain Serializer on purpose: read-only fields that don't exist on the
    user model are silently skipped instead of raising.
    """

    id = serializers.ReadOnlyField()
    username = serializers.CharField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    email = serializers.CharField(read_only=True)
    role = serializers.CharField(read_only=True)
    vehicles = serializers.SerializerMethodField()

    def get_vehicles(self, obj):
        return DriverVehicleSerializer(obj.vehicles_driven.all(), many=True).data


# ----------------------------------------------------------------------
# Passengers
# ----------------------------------------------------------------------
class DriverPassengerSerializer(serializers.ModelSerializer):
    boarding_stop_name = serializers.SerializerMethodField()
    alighting_stop_name = serializers.SerializerMethodField()
    boarding_sequence = serializers.SerializerMethodField()
    alighting_sequence = serializers.SerializerMethodField()

    class Meta:
        model = TransportPassenger
        fields = [
            "id",
            "name",
            "contact_number",
            "status",
            "notes",
            "boarding_stop",
            "boarding_stop_name",
            "boarding_sequence",
            "alighting_stop",
            "alighting_stop_name",
            "alighting_sequence",
        ]
        read_only_fields = fields

    def get_boarding_stop_name(self, obj):
        return obj.boarding_stop.location.name if obj.boarding_stop else None

    def get_alighting_stop_name(self, obj):
        return obj.alighting_stop.location.name if obj.alighting_stop else None

    def get_boarding_sequence(self, obj):
        return obj.boarding_stop.sequence if obj.boarding_stop else None

    def get_alighting_sequence(self, obj):
        return obj.alighting_stop.sequence if obj.alighting_stop else None


# ----------------------------------------------------------------------
# Stops
# ----------------------------------------------------------------------
class DriverStopSerializer(serializers.ModelSerializer):
    """
    Expects `origin_id` and `destination_id` in the serializer context
    (set by DriverTripDetailSerializer.get_stops).
    """

    location = DriverLocationSerializer(read_only=True)
    is_origin = serializers.SerializerMethodField()
    is_destination = serializers.SerializerMethodField()
    state = serializers.SerializerMethodField()
    boarding = serializers.SerializerMethodField()
    alighting = serializers.SerializerMethodField()
    planned_occupancy = serializers.SerializerMethodField()

    class Meta:
        model = TransportationStop
        fields = [
            "id",
            "sequence",
            "location",
            "expected_arrival",
            "expected_departure",
            "actual_arrival",
            "actual_departure",
            "notes",
            "is_origin",
            "is_destination",
            "state",
            "boarding",
            "alighting",
            "planned_occupancy",
        ]
        read_only_fields = fields

    def get_is_origin(self, obj):
        return obj.pk == self.context.get("origin_id")

    def get_is_destination(self, obj):
        return obj.pk == self.context.get("destination_id")

    def get_state(self, obj):
        if obj.actual_departure:
            return "departed"
        if obj.actual_arrival:
            return "arrived"
        return "upcoming"

    def get_boarding(self, obj):
        """Riders scheduled to get on here (blank boarding stop = origin)."""
        qs = obj.transportation.passengers.filter(status__in=LIVE_STATUSES)
        here = qs.filter(boarding_stop=obj)
        if self.get_is_origin(obj):
            here = qs.filter(boarding_stop=obj) | qs.filter(boarding_stop__isnull=True)
        return {
            "expected": here.count(),
            "checked_in": here.filter(status__in=("checked_in", "completed")).count(),
        }

    def get_alighting(self, obj):
        """Riders scheduled to get off here (blank alighting stop = final stop)."""
        qs = obj.transportation.passengers.filter(status__in=LIVE_STATUSES)
        here = qs.filter(alighting_stop=obj)
        if self.get_is_destination(obj):
            here = qs.filter(alighting_stop=obj) | qs.filter(alighting_stop__isnull=True)
        return {
            "expected": here.count(),
            "completed": here.filter(status="completed").count(),
        }

    def get_planned_occupancy(self, obj):
        return obj.transportation.occupancy_at_stop(obj)


# ----------------------------------------------------------------------
# Trips
# ----------------------------------------------------------------------
class DriverTripSummarySerializer(serializers.ModelSerializer):
    vehicle = DriverVehicleSerializer(read_only=True)
    origin = serializers.SerializerMethodField()
    destination = serializers.SerializerMethodField()
    is_accepted = serializers.SerializerMethodField()
    max_capacity = serializers.IntegerField(read_only=True)
    occupied_seats = serializers.IntegerField(read_only=True)
    available_seats = serializers.IntegerField(read_only=True)
    passenger_count = serializers.SerializerMethodField()

    class Meta:
        model = Transportation
        fields = [
            "id",
            "title",
            "category",
            "sub_category",
            "categorydesc",
            "desc",
            "status",
            "notes",
            "vehicle",
            "driver_accepted_at",
            "is_accepted",
            "actual_departure_time",
            "actual_arrival_time",
            "origin",
            "destination",
            "max_capacity",
            "occupied_seats",
            "available_seats",
            "passenger_count",
        ]
        read_only_fields = fields

    def get_origin(self, obj):
        stop = obj.origin_stop
        return DriverStopBriefSerializer(stop).data if stop else None

    def get_destination(self, obj):
        stop = obj.destination_stop
        return DriverStopBriefSerializer(stop).data if stop else None

    def get_is_accepted(self, obj):
        return obj.driver_accepted_at is not None

    def get_passenger_count(self, obj):
        return obj.passengers.filter(status__in=("reserved", "checked_in")).count()


class DriverTripDetailSerializer(DriverTripSummarySerializer):
    stops = serializers.SerializerMethodField()
    passengers = serializers.SerializerMethodField()

    class Meta(DriverTripSummarySerializer.Meta):
        fields = DriverTripSummarySerializer.Meta.fields + ["stops", "passengers"]
        read_only_fields = fields

    def get_stops(self, obj):
        stops = list(obj.stops.select_related("location").order_by("sequence"))
        context = {
            **self.context,
            "origin_id": stops[0].pk if stops else None,
            "destination_id": stops[-1].pk if stops else None,
        }
        return DriverStopSerializer(stops, many=True, context=context).data

    def get_passengers(self, obj):
        passengers = obj.passengers.select_related(
            "boarding_stop__location", "alighting_stop__location"
        ).order_by("name", "pk")
        return DriverPassengerSerializer(passengers, many=True, context=self.context).data


# ----------------------------------------------------------------------
# Input serializers (request bodies)
# ----------------------------------------------------------------------
class DeclineTripInputSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=300)


class DelayInputSerializer(serializers.Serializer):
    notes = serializers.CharField(max_length=500)  # required, non-blank


class StopActionInputSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True, max_length=300)
    # Only used when departing: confirms leaving more than the allowed window early.
    confirm_early = serializers.BooleanField(required=False, default=False)


class PassengerAlightInputSerializer(serializers.Serializer):
    stop = serializers.CharField()  # id of the stop the passenger is getting off at
    reason = serializers.CharField(required=False, allow_blank=True, max_length=100)


class WalkInInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)  # required, non-blank
    contact_number = serializers.CharField(required=False, allow_blank=True, max_length=50)
    # Blank / missing = rides to the final stop (same meaning as on TransportPassenger).
    alighting_stop = serializers.CharField(required=False, allow_blank=True, allow_null=True)



from django.apps import apps
from rest_framework import serializers

from .models import Transportation, TransportationStop, TransportReservation

# Guest lives next to Booking/BookingGuest (app label "api" assumed). Change if different.
Guest = apps.get_model("api", "Guest")

CLOSED_TRIP_STATUSES = ("Cancelled", "Completed")


class ReservableGuestSerializer(serializers.ModelSerializer):
    """Only what the picker needs; ID number / document are deliberately left out."""

    class Meta:
        model = Guest
        fields = ["id", "full_name", "age", "gender", "local"]
        read_only_fields = fields


class ReservationSerializer(serializers.ModelSerializer):
    transportation = serializers.SerializerMethodField()
    boarding_stop_name = serializers.SerializerMethodField()
    alighting_stop_name = serializers.SerializerMethodField()
    guests = serializers.SerializerMethodField()

    class Meta:
        model = TransportReservation
        fields = [
            "id",
            "status",
            "transportation",
            "boarding_stop",
            "boarding_stop_name",
            "alighting_stop",
            "alighting_stop_name",
            "guests",
            "notes",
            "rejection_reason",
        ]
        read_only_fields = fields

    def get_transportation(self, obj):
        return {"id": obj.transportation_id, "title": obj.transportation.title}

    def get_boarding_stop_name(self, obj):
        return obj.boarding_stop.location.name if obj.boarding_stop else None

    def get_alighting_stop_name(self, obj):
        return obj.alighting_stop.location.name if obj.alighting_stop else None

    def get_guests(self, obj):
        return [
            {"id": tg.guest_id, "full_name": tg.guest.full_name}
            for tg in obj.travel_guests.all()
        ]


class ReservationCreateSerializer(serializers.Serializer):
    transportation = serializers.PrimaryKeyRelatedField(
        queryset=Transportation.objects.filter(is_active=True)
    )
    boarding_stop = serializers.PrimaryKeyRelatedField(
        queryset=TransportationStop.objects.all(), required=False, allow_null=True
    )
    alighting_stop = serializers.PrimaryKeyRelatedField(
        queryset=TransportationStop.objects.all(), required=False, allow_null=True
    )
    guests = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Guest.objects.none(), allow_empty=False
    )
    notes = serializers.CharField(required=False, allow_blank=True, max_length=300)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            # A tourist can only request their own, active, saved guests.
            self.fields["guests"].child_relation.queryset = Guest.objects.filter(
                owner=request.user, is_active=True
            )

    def validate(self, attrs):
        trip = attrs["transportation"]
        if trip.status in CLOSED_TRIP_STATUSES:
            raise serializers.ValidationError("This trip is no longer taking reservations.")

        stops = list(trip.stops.order_by("sequence"))
        if not stops:
            raise serializers.ValidationError("This trip has no route yet.")

        boarding = attrs.get("boarding_stop")  # None = origin
        alighting = attrs.get("alighting_stop")  # None = final stop
        for label, stop in (("pickup", boarding), ("drop-off", alighting)):
            if stop is not None and stop.transportation_id != trip.pk:
                raise serializers.ValidationError(f"The {label} stop isn't part of this trip.")

        start = boarding or stops[0]
        end = alighting or stops[-1]
        if start.sequence >= end.sequence:
            raise serializers.ValidationError("The drop-off stop must come after the pickup stop.")
        if start.actual_departure:
            raise serializers.ValidationError("The vehicle has already left that pickup stop.")
        if end.actual_arrival:
            raise serializers.ValidationError("The vehicle has already passed that drop-off stop.")

        # De-duplicate the selected guests
        guests = list({g.pk: g for g in attrs["guests"]}.values())
        attrs["guests"] = guests

        # A guest can't be in two live requests (pending/approved) for the same trip
        clashes = _clashing_guest_names(trip, guests)
        if clashes:
            raise serializers.ValidationError(
                f"Already requested or reserved on this trip: {', '.join(clashes)}."
            )

        # Early, friendly seat check (the authoritative one runs again on approval)
        if trip.vehicle:
            peak = trip.max_occupancy_between(boarding, alighting)
            free = max(trip.vehicle.capacity - peak, 0)
            if len(guests) > free:
                raise serializers.ValidationError(
                    f"Only {free} seat(s) left on that part of the route; "
                    f"you selected {len(guests)}."
                )

        return attrs


def _clashing_guest_names(trip, guests):
    """Names of guests already in a pending/approved request for this trip."""
    from .models import TravelGuest

    rows = TravelGuest.objects.filter(
        reservation__transportation=trip,
        reservation__status__in=("pending", "approved"),
        guest__in=guests,
    ).select_related("guest")
    return sorted({row.guest.full_name for row in rows})




#admin
from rest_framework import serializers

from .models import TransportReservation


def _user_name(user):
    """Best readable name for a user, whatever fields the user model has."""
    if user is None:
        return None
    full_name = ""
    get_full_name = getattr(user, "get_full_name", None)
    if callable(get_full_name):
        full_name = (get_full_name() or "").strip()
    return full_name or getattr(user, "username", None) or getattr(user, "email", None) or f"User #{user.pk}"


class AdminReservationSerializer(serializers.ModelSerializer):
    """What an admin needs to review a reservation request (includes ID details for verification)."""

    transportation = serializers.SerializerMethodField()
    requester = serializers.SerializerMethodField()
    boarding_stop_name = serializers.SerializerMethodField()
    alighting_stop_name = serializers.SerializerMethodField()
    guests = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TransportReservation
        fields = [
            "id",
            "status",
            "transportation",
            "requester",
            "boarding_stop",
            "boarding_stop_name",
            "alighting_stop",
            "alighting_stop_name",
            "guests",
            "notes",
            "rejection_reason",
            "reviewed_by_name",
            "reviewed_at",
        ]
        read_only_fields = fields

    def get_transportation(self, obj):
        return {"id": obj.transportation_id, "title": obj.transportation.title}

    def get_requester(self, obj):
        user = obj.requester
        return {
            "id": user.pk,
            "name": _user_name(user),
            "email": getattr(user, "email", None) or None,
        }

    # A blank boarding/alighting stop means origin / final stop (same rule as TransportPassenger).
    def get_boarding_stop_name(self, obj):
        stop = obj.boarding_stop or obj.transportation.origin_stop
        return stop.location.name if stop else None

    def get_alighting_stop_name(self, obj):
        stop = obj.alighting_stop or obj.transportation.destination_stop
        return stop.location.name if stop else None

    def get_guests(self, obj):
        request = self.context.get("request")
        guests = []
        for travel_guest in obj.travel_guests.all():
            guest = travel_guest.guest
            document_url = None
            if guest.id_document:
                try:
                    document_url = guest.id_document.url
                    if request is not None:
                        document_url = request.build_absolute_uri(document_url)
                except ValueError:
                    document_url = None
            guests.append(
                {
                    "id": guest.pk,
                    "full_name": guest.full_name,
                    "age": guest.age,
                    "gender": guest.gender,
                    "local": guest.local,
                    "id_number": guest.id_number or None,
                    "id_document": document_url,
                    "added_as_passenger": travel_guest.passenger_id is not None,
                }
            )
        return guests

    def get_reviewed_by_name(self, obj):
        return _user_name(obj.reviewed_by)