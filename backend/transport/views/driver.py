from datetime import timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Min, Q
from django.http import Http404
from django.utils import timezone
from rest_framework.exceptions import APIException
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..serializers import (
    DeclineTripInputSerializer,
    DelayInputSerializer,
    DriverProfileSerializer,
    DriverTripDetailSerializer,
    DriverTripSummarySerializer,
    PassengerAlightInputSerializer,
    StopActionInputSerializer,
    WalkInInputSerializer,
)
from ..models import Transportation, TransportationStop, TransportPassenger

DRIVER_ROLE = "driver"

# Transportation.status is nullable, so "no status" is treated as Scheduled.
PRE_DEPARTURE = (None, "", "Scheduled")

# A driver may depart a stop without extra confirmation from this long before its
# planned departure time. Earlier than that needs confirm_early=true (warn, then allow).
# Stops with no expected_departure are never restricted. Leaving late is always fine.
EARLY_DEPARTURE_WINDOW = timedelta(minutes=60)


# ----------------------------------------------------------------------
# Plumbing
# ----------------------------------------------------------------------
class DriverActionError(APIException):
    """400 with a {"detail": "..."} body the frontend can show as-is."""

    status_code = 400
    default_detail = "This action is not allowed."
    default_code = "driver_action_error"


class IsDriver(BasePermission):
    message = "Only drivers can access this resource."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "role", None) == DRIVER_ROLE
        )


class DriverAPIView(APIView):
    permission_classes = [IsAuthenticated, IsDriver]


def _lookup(queryset, pk):
    """get() that turns bad/unknown ids (int or UUID) into a clean 404."""
    try:
        return queryset.get(pk=pk)
    except (queryset.model.DoesNotExist, ValueError, TypeError, DjangoValidationError):
        raise Http404


def get_trip(request, trip_id, lock=False):
    """A trip, only if it is assigned to the requesting driver. lock=True needs transaction.atomic()."""
    qs = Transportation.objects.filter(driver=request.user)
    if lock:
        qs = qs.select_for_update()
    return _lookup(qs, trip_id)


def get_passenger(trip, passenger_id):
    qs = TransportPassenger.objects.filter(transportation=trip).select_related(
        "boarding_stop", "alighting_stop"
    )
    return _lookup(qs, passenger_id)


def ordered_stops(trip):
    return list(trip.stops.select_related("location").order_by("sequence"))


def find_stop(stops, stop_id):
    stop = next((s for s in stops if str(s.pk) == str(stop_id)), None)
    if stop is None:
        raise Http404
    return stop


def ensure_open(trip, allow_completed=False):
    """Trip must be accepted and not cancelled (or completed, unless allowed)."""
    if trip.status == "Cancelled":
        raise DriverActionError("This trip was cancelled.")
    if trip.status == "Completed" and not allow_completed:
        raise DriverActionError("This trip is already completed.")
    if trip.driver_accepted_at is None:
        raise DriverActionError("Accept this trip first.")


def save_passenger(passenger):
    """Passenger.save() runs full_clean + seat-capacity checks; surface those as 400s."""
    try:
        passenger.save()
    except DjangoValidationError as exc:
        raise DriverActionError(" ".join(exc.messages))


def append_note(existing, line):
    return f"{existing}\n{line}" if existing else line


def trip_response(request, trip, extra=None):
    fresh = Transportation.objects.select_related("vehicle").get(pk=trip.pk)
    data = dict(DriverTripDetailSerializer(fresh, context={"request": request}).data)
    if extra is not None:
        data["action_result"] = extra
    return Response(data)


# ----------------------------------------------------------------------
# Read endpoints
# ----------------------------------------------------------------------
class DriverProfileView(DriverAPIView):
    def get(self, request):
        return Response(DriverProfileSerializer(request.user).data)


class DriverTripListView(DriverAPIView):
    def get(self, request):
        trips = (
            Transportation.objects.filter(driver=request.user)
            .select_related("vehicle")
            .annotate(first_departure=Min("stops__expected_departure"))
            .order_by("first_departure", "pk")
        )
        status_filter = request.query_params.get("status")
        if status_filter:
            trips = trips.filter(status=status_filter)
        return Response(
            DriverTripSummarySerializer(trips, many=True, context={"request": request}).data
        )


class DriverTripDetailView(DriverAPIView):
    def get(self, request, trip_id):
        trip = get_trip(request, trip_id)
        return trip_response(request, trip)


# ----------------------------------------------------------------------
# Trip-level actions
# ----------------------------------------------------------------------
class AcceptTripView(DriverAPIView):
    def post(self, request, trip_id):
        with transaction.atomic():
            trip = get_trip(request, trip_id, lock=True)
            if trip.driver_accepted_at is None:  # already accepted -> no-op (double taps)
                if trip.status not in PRE_DEPARTURE:
                    raise DriverActionError("Only scheduled trips can be accepted.")
                trip.driver_accepted_at = timezone.now()
                trip.save()
        return trip_response(request, trip)


class DeclineTripView(DriverAPIView):
    def post(self, request, trip_id):
        body = DeclineTripInputSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        reason = body.validated_data.get("reason", "").strip()

        with transaction.atomic():
            trip = get_trip(request, trip_id, lock=True)
            if trip.status not in PRE_DEPARTURE:
                raise DriverActionError("Only trips that haven't departed can be declined.")
            line = f"Declined by {request.user}" + (f": {reason}" if reason else "")
            trip.notes = append_note(trip.notes, line)
            trip.driver = None
            trip.driver_accepted_at = None
            trip.save()
        return Response({"detail": "Trip declined.", "id": trip.pk})


class ReportDelayView(DriverAPIView):
    def post(self, request, trip_id):
        body = DelayInputSerializer(data=request.data)
        body.is_valid(raise_exception=True)

        with transaction.atomic():
            trip = get_trip(request, trip_id, lock=True)
            ensure_open(trip)
            if trip.status not in PRE_DEPARTURE + ("Departed", "Delayed"):
                raise DriverActionError("A delay can't be reported for this trip.")
            trip.status = "Delayed"
            trip.notes = append_note(trip.notes, f"Delay: {body.validated_data['notes'].strip()}")
            trip.save()
        return trip_response(request, trip)


# ----------------------------------------------------------------------
# Stop actions
# ----------------------------------------------------------------------
class ArriveAtStopView(DriverAPIView):
    def post(self, request, trip_id, stop_id):
        body = StopActionInputSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        notes = body.validated_data.get("notes", "").strip()

        with transaction.atomic():
            trip = get_trip(request, trip_id, lock=True)
            ensure_open(trip)
            stops = ordered_stops(trip)
            stop = find_stop(stops, stop_id)
            idx = stops.index(stop)

            if stop.actual_arrival:
                raise DriverActionError("Arrival at this stop is already recorded.")
            if idx > 0 and stops[idx - 1].actual_departure is None:
                raise DriverActionError(
                    f"Mark departure from {stops[idx - 1].location.name} first."
                )

            now = timezone.now()
            stop.actual_arrival = now
            if notes:
                stop.notes = notes
            stop.save()

            if idx == len(stops) - 1:  # reached the final destination
                trip.status = "Completed"
                trip.actual_arrival_time = now
                trip.save()
        return trip_response(request, trip)


class DepartFromStopView(DriverAPIView):
    def post(self, request, trip_id, stop_id):
        body = StopActionInputSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        notes = body.validated_data.get("notes", "").strip()

        with transaction.atomic():
            trip = get_trip(request, trip_id, lock=True)
            ensure_open(trip)
            stops = ordered_stops(trip)
            stop = find_stop(stops, stop_id)
            idx = stops.index(stop)

            if idx == len(stops) - 1:
                raise DriverActionError(
                    "This is the final stop; the trip completes when you arrive."
                )
            if stop.actual_departure:
                raise DriverActionError("Departure from this stop is already recorded.")
            if idx > 0 and stop.actual_arrival is None:
                raise DriverActionError("Mark arrival at this stop first.")

            now = timezone.now()
            if (
                stop.expected_departure
                and not body.validated_data.get("confirm_early", False)
                and now < stop.expected_departure - EARLY_DEPARTURE_WINDOW
            ):
                earliest = stop.expected_departure - EARLY_DEPARTURE_WINDOW
                raise DriverActionError(
                    {
                        "detail": "Too early to depart from this stop. Confirm to depart anyway.",
                        "code": "early_departure",
                        "earliest_allowed": earliest.isoformat(),
                    }
                )
            stop.actual_departure = now
            if notes:
                stop.notes = notes
            stop.save()

            if trip.actual_departure_time is None:
                trip.actual_departure_time = now
            if trip.status in PRE_DEPARTURE or trip.status == "Delayed":
                trip.status = "Departed"  # also resumes a trip that was marked Delayed
            trip.save()
        return trip_response(request, trip)


class AlightAtStopView(DriverAPIView):
    """
    Bulk turnover: every CHECKED-IN passenger scheduled to get off at this stop
    (blank alighting stop = the final stop) is marked completed. Passengers who
    were never checked in are left untouched and reported back.
    """

    def post(self, request, trip_id, stop_id):
        with transaction.atomic():
            trip = get_trip(request, trip_id, lock=True)
            ensure_open(trip, allow_completed=True)
            stops = ordered_stops(trip)
            stop = find_stop(stops, stop_id)

            if stop.actual_arrival is None:
                raise DriverActionError("Mark arrival at this stop first.")

            scheduled = Q(alighting_stop=stop)
            if stop.pk == stops[-1].pk:
                scheduled |= Q(alighting_stop__isnull=True)
            here = trip.passengers.filter(scheduled)

            completed = here.filter(status="checked_in").update(status="completed")
            still_reserved = here.filter(status="reserved").count()

        return trip_response(
            request,
            trip,
            extra={"completed": completed, "still_reserved": still_reserved},
        )


# ----------------------------------------------------------------------
# Passenger actions
# ----------------------------------------------------------------------
class CheckInPassengerView(DriverAPIView):
    def post(self, request, trip_id, passenger_id):
        with transaction.atomic():
            trip = get_trip(request, trip_id, lock=True)
            ensure_open(trip)
            passenger = get_passenger(trip, passenger_id)

            if passenger.status != "checked_in":  # already checked in -> no-op
                if passenger.status != "reserved":
                    raise DriverActionError(
                        f"{passenger.name} is {passenger.get_status_display().lower()} "
                        "and can't be checked in."
                    )
                passenger.status = "checked_in"
                save_passenger(passenger)
        return trip_response(request, trip)


class AddWalkInPassengerView(DriverAPIView):
    """
    A rider with no reservation boards at the stop the vehicle is at right now.
    Created already checked in. Seat capacity is enforced by TransportPassenger.save()
    for every segment between the boarding and drop-off stops.
    """

    def post(self, request, trip_id, stop_id):
        body = WalkInInputSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        data = body.validated_data

        with transaction.atomic():
            trip = get_trip(request, trip_id, lock=True)
            ensure_open(trip)
            stops = ordered_stops(trip)
            stop = find_stop(stops, stop_id)
            idx = stops.index(stop)

            if idx == len(stops) - 1:
                raise DriverActionError("Passengers can't board at the final stop.")

            # "Current stop" = first stop the vehicle hasn't departed from yet.
            current = next((s for s in stops if s.actual_departure is None), None)
            if current is None or current.pk != stop.pk:
                raise DriverActionError(
                    "Walk-ins can only be added at the stop where the vehicle currently is."
                )
            if idx > 0 and stop.actual_arrival is None:
                raise DriverActionError("Mark arrival at this stop first.")

            alighting = None
            raw_alighting = data.get("alighting_stop")
            if raw_alighting not in (None, ""):
                alighting = next((s for s in stops if str(s.pk) == str(raw_alighting)), None)
                if alighting is None:
                    raise DriverActionError("That drop-off stop isn't part of this trip.")
                if alighting.sequence <= stop.sequence:
                    raise DriverActionError("The drop-off stop must come after the boarding stop.")

            passenger = TransportPassenger(
                transportation=trip,
                name=data["name"].strip(),
                contact_number=(data.get("contact_number") or "").strip() or None,
                boarding_stop=stop,
                alighting_stop=alighting,  # None = rides to the final stop
                status="checked_in",
            )
            save_passenger(passenger)  # capacity / validation errors -> 400
        return trip_response(request, trip)


class MarkNoShowView(DriverAPIView):
    def post(self, request, trip_id, passenger_id):
        with transaction.atomic():
            trip = get_trip(request, trip_id, lock=True)
            ensure_open(trip)
            passenger = get_passenger(trip, passenger_id)

            if passenger.status != "no_show":  # already no-show -> no-op
                if passenger.status != "reserved":
                    raise DriverActionError(
                        f"Only passengers who haven't boarded can be marked no-show "
                        f"({passenger.name} is {passenger.get_status_display().lower()})."
                    )
                passenger.status = "no_show"
                save_passenger(passenger)
        return trip_response(request, trip)


class AlightPassengerView(DriverAPIView):
    """Individual get-off, including unplanned early departures (uses Transportation.depart_passenger_early)."""

    def post(self, request, trip_id, passenger_id):
        body = PassengerAlightInputSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        reason = body.validated_data.get("reason", "").strip()

        with transaction.atomic():
            trip = get_trip(request, trip_id, lock=True)
            ensure_open(trip, allow_completed=True)
            passenger = get_passenger(trip, passenger_id)

            if passenger.status != "checked_in":
                raise DriverActionError("Only passengers who are checked in can get off.")

            stops = ordered_stops(trip)
            try:
                stop = find_stop(stops, body.validated_data["stop"])
            except Http404:
                raise DriverActionError("That stop isn't part of this trip.")

            if stop.actual_arrival is None:
                raise DriverActionError("Mark arrival at that stop first.")
            planned = passenger.alighting_stop
            if planned is not None and stop.sequence > planned.sequence:
                raise DriverActionError(
                    f"{passenger.name} is scheduled to get off at {planned.location.name}, "
                    "not later than that."
                )

            try:
                trip.depart_passenger_early(passenger, stop, reason or None)
            except DjangoValidationError as exc:
                raise DriverActionError(" ".join(exc.messages))
        return trip_response(request, trip)


