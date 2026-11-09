"""
Admin-only travel report endpoints.

    GET api/admin-transport/reports/            -> catalog of reports + filter options
    GET api/admin-transport/reports/<key>/      -> one report (see reports_engine.REPORTS)

Query params (each only applies if that report lists it in its `filters`):
    date_from, date_to   YYYY-MM-DD, inclusive, in local time (a trip's date is its actual
                         departure, else the origin stop's planned departure/arrival)
    vehicle, driver      ids
    status               Scheduled | Departed | Delayed | Cancelled | Completed
    group                day | week | month   (bucket size for the per-period tables)
    trip                 trip id (manifest only)

The views only load rows and turn them into plain snapshots; all the maths is in
reports_engine.py.
"""
from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Prefetch, Q
from django.http import Http404
from django.utils import timezone
from rest_framework.exceptions import APIException
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


from .. import Reports_engine as eng
from ..models import (
    Transportation,
    TransportationStop,
    TransportPassenger,
    TransportReservation,
    Vehicle,
)

VALID_GROUPS = ("day", "week", "month")


class ReportError(APIException):
    status_code = 400
    default_detail = "Invalid report request."
    default_code = "report_error"


class IsReportsAdmin(BasePermission):
    message = "Only admins can view travel reports."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or getattr(user, "role", None) == "admin")
        )


class ReportsAPIView(APIView):
    permission_classes = [IsAuthenticated, IsReportsAdmin]


# ----------------------------------------------------------------------
# Small helpers
# ----------------------------------------------------------------------
def _local(value):
    """Aware datetime -> local time (so .date() / strftime match what people see)."""
    if value is None:
        return None
    if timezone.is_naive(value):
        return value
    return timezone.localtime(value)


def _user_label(user):
    if user is None:
        return None
    full_name = ""
    getter = getattr(user, "get_full_name", None)
    if callable(getter):
        full_name = (getter() or "").strip()
    return full_name or getattr(user, "username", None) or getattr(user, "email", None) or f"User #{user.pk}"


def _parse_date(value, label):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        raise ReportError(f"{label} must look like 2026-11-09.")


def _bounds(params):
    date_from = _parse_date(params.get("date_from"), "date_from")
    date_to = _parse_date(params.get("date_to"), "date_to")
    if date_from and date_to and date_to < date_from:
        raise ReportError("date_to can't be before date_from.")
    return date_from, date_to


def _in_period(day, date_from, date_to):
    if date_from is None and date_to is None:
        return True
    if day is None:
        return False
    if date_from is not None and day < date_from:
        return False
    if date_to is not None and day > date_to:
        return False
    return True


def _aware_start(day):
    return timezone.make_aware(datetime.combine(day, time.min))


# ----------------------------------------------------------------------
# Row loading -> snapshots
# ----------------------------------------------------------------------
def _trip_queryset():
    return (
        Transportation.objects.filter(is_active=True)
        .select_related("vehicle", "driver")
        .prefetch_related(
            Prefetch(
                "stops",
                queryset=TransportationStop.objects.select_related("location").order_by("sequence"),
            ),
            Prefetch("passengers", queryset=TransportPassenger.objects.filter(is_active=True)),
        )
    )


def _trip_snap(trip):
    stops = [
        eng.StopSnap(
            id=s.pk,
            seq=s.sequence,
            name=s.location.name,
            exp_arr=_local(s.expected_arrival),
            exp_dep=_local(s.expected_departure),
            act_arr=_local(s.actual_arrival),
            act_dep=_local(s.actual_departure),
        )
        for s in trip.stops.all()
    ]
    act_dep = _local(trip.actual_departure_time)
    when = act_dep
    if when is None and stops:
        when = stops[0].exp_dep or stops[0].exp_arr
    vehicle = trip.vehicle
    driver = trip.driver
    return eng.TripSnap(
        id=trip.pk,
        title=trip.title,
        status=trip.status or "Scheduled",  # the model allows a blank status: treat as Scheduled
        local_date=when.date() if when else None,
        vehicle_id=vehicle.pk if vehicle else None,
        vehicle_name=vehicle.vehicle_name if vehicle else None,
        plate=vehicle.plate_number if vehicle else None,
        capacity=vehicle.capacity if vehicle else None,
        driver_id=driver.pk if driver else None,
        driver_name=_user_label(driver),
        driver_key=str(driver) if driver else None,  # what "Declined by ..." notes contain
        accepted_at=getattr(trip, "driver_accepted_at", None),
        notes=trip.notes,
        act_dep=act_dep,
        act_arr=_local(trip.actual_arrival_time),
        stops=stops,
        passengers=[
            eng.PassengerSnap(
                id=p.pk,
                name=p.name,
                status=p.status,
                source=getattr(p, "source", None),
                contact=p.contact_number,
                notes=p.notes,
                boarding_stop_id=p.boarding_stop_id,
                alighting_stop_id=p.alighting_stop_id,
            )
            for p in trip.passengers.all()
        ],
    )


def _reservation_queryset():
    return (
        TransportReservation.objects.filter(is_active=True)
        .select_related(
            "transportation",
            "requester",
            "boarding_stop__location",
            "alighting_stop__location",
        )
        .prefetch_related(
            "travel_guests",
            Prefetch(
                "transportation__stops",
                queryset=TransportationStop.objects.select_related("location").order_by("sequence"),
            ),
        )
    )


def _reservation_snap(r):
    trip = r.transportation
    stops = list(trip.stops.all())
    origin = stops[0].location.name if stops else "(unknown stop)"
    destination = stops[-1].location.name if stops else "(unknown stop)"
    if len(stops) >= 2:
        route = f"{origin} → {destination}"
    elif stops:
        route = origin
    else:
        route = "No route"
    created = _local(getattr(r, "created_at", None))
    return eng.ReservationSnap(
        id=r.pk,
        status=r.status,
        trip_id=trip.pk,
        trip_title=trip.title,
        route=route,
        requester=_user_label(r.requester) or "",
        guest_count=len(list(r.travel_guests.all())),
        created_at=created,
        created_date=created.date() if created else None,
        reviewed_at=_local(r.reviewed_at),
        reason=r.rejection_reason,
        pickup=r.boarding_stop.location.name if r.boarding_stop else origin,
        dropoff=r.alighting_stop.location.name if r.alighting_stop else destination,
    )


def _evaluate(queryset):
    """Run a queryset, turning bad filter values (e.g. a non-numeric id) into a clean 400."""
    try:
        return list(queryset)
    except (ValueError, TypeError, DjangoValidationError):
        raise ReportError("One of the filters has an invalid value.")


def _apply_trip_filters(queryset, spec, params, skip=()):
    if "vehicle" in spec.filters and "vehicle" not in skip and params.get("vehicle"):
        queryset = queryset.filter(vehicle_id=params["vehicle"])
    if "driver" in spec.filters and "driver" not in skip and params.get("driver"):
        queryset = queryset.filter(driver_id=params["driver"])
    status = params.get("status")
    if "status" in spec.filters and "status" not in skip and status:
        if status not in eng.STATUSES:
            raise ReportError("Unknown status.")
        if status == "Scheduled":
            queryset = queryset.filter(Q(status="Scheduled") | Q(status__isnull=True) | Q(status=""))
        else:
            queryset = queryset.filter(status=status)
    return queryset


# ----------------------------------------------------------------------
# Views
# ----------------------------------------------------------------------
class ReportCatalogView(ReportsAPIView):
    """The report list plus what the filter drop-downs should offer."""

    def get(self, request):
        User = get_user_model()
        vehicles = Vehicle.objects.filter(is_active=True).order_by("vehicle_name")
        drivers = sorted(
            User.objects.filter(transportation_trips__isnull=False).distinct(),
            key=lambda u: (_user_label(u) or "").lower(),
        )
        recent = (
            Transportation.objects.filter(is_active=True)
            .prefetch_related(
                Prefetch(
                    "stops",
                    queryset=TransportationStop.objects.select_related("location").order_by("sequence"),
                )
            )
            .order_by("-created_at")[:150]
        )
        trips = []
        for t in recent:
            stops = list(t.stops.all())
            first = stops[0].expected_departure or stops[0].expected_arrival if stops else None
            when = _local(first).strftime("%Y-%m-%d %H:%M") if first else "no date"
            trips.append({"id": t.pk, "name": f"{t.title} · {when}"})
        return Response(
            {
                "reports": eng.catalog(),
                "options": {
                    "vehicles": [
                        {"id": v.pk, "name": f"{v.vehicle_name} ({v.plate_number})"} for v in vehicles
                    ],
                    "drivers": [{"id": u.pk, "name": _user_label(u)} for u in drivers],
                    "statuses": list(eng.STATUSES),
                    "groups": list(VALID_GROUPS),
                    "trips": trips,
                },
            }
        )


class ReportRunView(ReportsAPIView):
    def get(self, request, key):
        spec = eng.REPORTS_BY_KEY.get(key)
        if spec is None:
            raise Http404

        params = request.query_params
        group = params.get("group") or "month"
        if group not in VALID_GROUPS:
            raise ReportError("group must be day, week or month.")

        ctx = {"group": group, "now": _local(timezone.now())}

        if "manifest" in spec.needs:
            trip_id = params.get("trip")
            if not trip_id:
                raise ReportError("Choose a trip first.")
            try:
                trip = _trip_queryset().get(pk=trip_id)
            except (Transportation.DoesNotExist, ValueError, TypeError, DjangoValidationError):
                raise Http404
            trips = [_trip_snap(trip)]
        else:
            date_from, date_to = (
                _bounds(params) if "period" in spec.filters else (None, None)
            )

            if "trips" in spec.needs:
                snaps = [_trip_snap(t) for t in _evaluate(_apply_trip_filters(_trip_queryset(), spec, params))]
                trips = [t for t in snaps if _in_period(t.local_date, date_from, date_to)]
            else:
                trips = []

            if "declines" in spec.needs:
                # Declined trips are unassigned again, so the driver filter can't find them:
                # load them by their note instead, and let the report narrow by driver name.
                declined = _trip_queryset().filter(notes__icontains="Declined by")
                declined = _apply_trip_filters(declined, spec, params, skip=("driver", "status"))
                snaps = [_trip_snap(t) for t in _evaluate(declined)]
                ctx["decline_trips"] = [t for t in snaps if _in_period(t.local_date, date_from, date_to)]
                if "driver" in spec.filters and params.get("driver"):
                    user = get_user_model().objects.filter(pk=params["driver"]).first() if str(params["driver"]).isdigit() else None
                    ctx["only_driver_key"] = str(user) if user else "\0no such driver"

            if "vehicles" in spec.needs:
                vehicle_qs = Vehicle.objects.filter(is_active=True)
                if "vehicle" in spec.filters and params.get("vehicle"):
                    vehicle_qs = vehicle_qs.filter(pk=params["vehicle"])
                ctx["vehicles"] = [
                    eng.VehicleSnap(v.pk, v.vehicle_name, v.plate_number, v.capacity, v.status)
                    for v in _evaluate(vehicle_qs)
                ]

            if "reservations" in spec.needs:
                reservations = _reservation_queryset()
                if "vehicle" in spec.filters and params.get("vehicle"):
                    reservations = reservations.filter(transportation__vehicle_id=params["vehicle"])
                if "driver" in spec.filters and params.get("driver"):
                    reservations = reservations.filter(transportation__driver_id=params["driver"])
                if date_from:
                    reservations = reservations.filter(created_at__gte=_aware_start(date_from))
                if date_to:
                    reservations = reservations.filter(created_at__lt=_aware_start(date_to + timedelta(days=1)))
                ctx["reservations"] = [_reservation_snap(r) for r in _evaluate(reservations)]

        body = spec.fn(trips, ctx)
        body["key"] = spec.key
        body["group"] = spec.group
        body["generated_at"] = ctx["now"].isoformat()
        return Response(body)