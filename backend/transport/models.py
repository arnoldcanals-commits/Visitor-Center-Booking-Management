from django.db import models
from django.db.models import Q
from django.conf import settings
from django.core.exceptions import ValidationError
from api.models import BaseModel
from django.core.validators import MinValueValidator, MaxValueValidator


class Location(BaseModel):
    name = models.CharField(max_length=200)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    address = models.CharField(max_length=300, blank=True, null=True)

    def __str__(self):
        return self.name


class Vehicle(BaseModel):

    STATUS_CHOICES = [
        ("on_trip", "On Trip"),
        ("available", "Available"),
        ("Maintenance", "Maintenance"),
    ]

    category = models.CharField(max_length=100)
    sub_category = models.CharField(max_length=100, blank=True, null=True)
    categorydesc = models.TextField(blank=True, null=True)
    title = models.CharField(max_length=200)
    desc = models.TextField(blank=True, null=True)

    vehicle_name = models.CharField(max_length=200)
    plate_number = models.CharField(max_length=200)
    capacity = models.IntegerField(validators=[
        MinValueValidator(1),
        MaxValueValidator(50)
    ])
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="vehicles_driven",
    )
    owner = models.CharField(max_length=200)
    affiliate = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, blank=True, null=True)

    def __str__(self):
        return f"{self.vehicle_name} ({self.plate_number})"


class Transportation(BaseModel):

    STATUS_CHOICES = [
        ("Scheduled", "Scheduled"),
        ("Departed", "Departed"),
        ("Delayed", "Delayed"),
        ("Cancelled", "Cancelled"),
        ("Completed", "Completed"),
    ]

    category = models.CharField(max_length=100)
    sub_category = models.CharField(max_length=100, blank=True, null=True)
    categorydesc = models.TextField(blank=True, null=True)
    title = models.CharField(max_length=200)
    desc = models.TextField(blank=True, null=True)

    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="trips",
    )
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transportation_trips",
    )

    # owner / affiliate / max_capacity are derived from the vehicle — see properties below

    actual_departure_time = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Actual time the vehicle departed on its first leg.",
    )
    actual_arrival_time = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Actual time of final arrival/completion.",
    )

    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Remarks, e.g. cause of delay or other notes.",
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, blank=True, null=True)

    # ------------------------------------------------------------------
    # Derived from vehicle
    # ------------------------------------------------------------------
    @property
    def max_capacity(self):
        return self.vehicle.capacity if self.vehicle else 0

    @property
    def owner(self):
        return self.vehicle.owner if self.vehicle else None

    @property
    def affiliate(self):
        return self.vehicle.affiliate if self.vehicle else None

    # ------------------------------------------------------------------
    # Route helpers
    # ------------------------------------------------------------------
    @property
    def origin_stop(self):
        return self.stops.order_by("sequence").first()

    @property
    def destination_stop(self):
        return self.stops.order_by("sequence").last()

    # ------------------------------------------------------------------
    # Segment-based occupancy (supports turnover along the route)
    # ------------------------------------------------------------------
    def occupancy_at_stop(self, stop):
        """
        Active passengers on board on the segment departing this stop.
        Blank boarding_stop = counted from the route's origin.
        Blank alighting_stop = counted all the way to the route's end.
        """
        return self.passengers.exclude(status__in=["cancelled", "no_show"]).filter(
            Q(boarding_stop__sequence__lte=stop.sequence) | Q(boarding_stop__isnull=True)
        ).filter(
            Q(alighting_stop__sequence__gt=stop.sequence) | Q(alighting_stop__isnull=True)
        ).count()

    def max_occupancy_between(self, boarding_stop, alighting_stop):
        """Peak occupancy across every segment a rider between these two stops would pass through."""
        b_seq = boarding_stop.sequence if boarding_stop else -1
        a_seq = alighting_stop.sequence if alighting_stop else float("inf")
        stops_in_range = [s for s in self.stops.all() if b_seq <= s.sequence < a_seq]
        return max((self.occupancy_at_stop(s) for s in stops_in_range), default=0)

    def mark_alighted_at_stop(self, stop):
        """
        Driver-facing turnover action: bulk-mark every active passenger
        scheduled to get off at this stop as completed, freeing their
        seats for anyone boarding further down the route.
        """
        return self.passengers.filter(
            alighting_stop=stop,
            status__in=["reserved", "checked_in"],
        ).update(status="completed")

    def depart_passenger_early(self, passenger, stop, reason=None):
        """
        Sudden/unplanned early departure: a passenger leaves before their
        planned alighting stop. Always allowed — narrowing a range only
        frees capacity, never exceeds it.
        """
        passenger.alighting_stop = stop
        passenger.status = "completed"
        if reason:
            passenger.notes = (passenger.notes + " | " if passenger.notes else "") + reason
        passenger.save()
        return passenger

    @property
    def occupied_seats(self):
        """Current peak occupancy across all active segments of the route."""
        stops = list(self.stops.all())
        if not stops:
            return self.passengers.exclude(status__in=["cancelled", "no_show"]).count()
        return max((self.occupancy_at_stop(s) for s in stops), default=0)

    @property
    def available_seats(self):
        return max(self.max_capacity - self.occupied_seats, 0)

    def clean(self):
        super().clean()
        if self.vehicle and self.pk and self.occupied_seats > self.vehicle.capacity:
            raise ValidationError(
                f"Reserved passengers ({self.occupied_seats}) exceed "
                f"vehicle capacity ({self.vehicle.capacity})."
            )

    def __str__(self):
        return self.title


class TransportationStop(BaseModel):
    """
    A single stop in a Transportation route, in order.
    First stop (lowest sequence) is the origin/pickup, last stop is the
    final destination; anything in between is a waypoint/layover.
    """

    transportation = models.ForeignKey(
        Transportation,
        on_delete=models.CASCADE,
        related_name="stops",
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
        related_name="transport_stops",
        help_text="Required — a stop must have a location.",
    )
    sequence = models.PositiveIntegerField(
        help_text="Order of this stop in the route. Gaps (0,10,20...) recommended for easy insertion."
    )

    expected_arrival = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Planned/expected arrival time at this stop.",
    )
    expected_departure = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Planned/expected departure time from this stop.",
    )
    actual_arrival = models.DateTimeField(blank=True, null=True)
    actual_departure = models.DateTimeField(blank=True, null=True)

    notes = models.CharField(
        max_length=300,
        blank=True,
        null=True,
        help_text="e.g. cause of delay at this stop.",
    )

    class Meta:
        ordering = ["sequence"]
        constraints = [
            models.UniqueConstraint(
                fields=["transportation", "sequence"],
                name="unique_stop_sequence_per_trip",
            )
        ]

    def __str__(self):
        return f"{self.transportation.title} - Stop {self.sequence}: {self.location.name}"


class TransportPassenger(BaseModel):
    """
    A reserved rider on a Transportation trip. Not tied to a user
    account — most riders (guests, walk-ins, etc.) won't exist in
    the system, so we just record their name.
    """

    STATUS_CHOICES = [
        ("reserved", "Reserved"),
        ("checked_in", "Checked In"),
        ("completed", "Completed"),   # alighted — seat freed
        ("no_show", "No Show"),
        ("cancelled", "Cancelled"),
    ]

    transportation = models.ForeignKey(
        Transportation,
        on_delete=models.CASCADE,
        related_name="passengers",
    )
    name = models.CharField(max_length=200)
    contact_number = models.CharField(max_length=50, blank=True, null=True)

    boarding_stop = models.ForeignKey(
        TransportationStop,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="boarding_passengers",
        help_text="Blank = boards at the route's origin.",
    )
    alighting_stop = models.ForeignKey(
        TransportationStop,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alighting_passengers",
        help_text="Blank = rides to the route's final destination.",
    )

    notes = models.CharField(max_length=300, blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="reserved",
    )

    def clean(self):
        super().clean()
        if self.boarding_stop and self.boarding_stop.transportation_id != self.transportation_id:
            raise ValidationError("Boarding stop must belong to this trip.")
        if self.alighting_stop and self.alighting_stop.transportation_id != self.transportation_id:
            raise ValidationError("Alighting stop must belong to this trip.")
        if self.boarding_stop and self.alighting_stop:
            if self.boarding_stop.sequence >= self.alighting_stop.sequence:
                raise ValidationError("Alighting stop must come after boarding stop.")

    def _is_range_shrinking(self):
        """True if this edit only narrows the boarding->alighting range (safe, never over-capacity)."""
        if not self.pk:
            return False
        try:
            old = TransportPassenger.objects.get(pk=self.pk)
        except TransportPassenger.DoesNotExist:
            return False
        old_b = old.boarding_stop.sequence if old.boarding_stop else -1
        old_a = old.alighting_stop.sequence if old.alighting_stop else float("inf")
        new_b = self.boarding_stop.sequence if self.boarding_stop else -1
        new_a = self.alighting_stop.sequence if self.alighting_stop else float("inf")
        return new_b >= old_b and new_a <= old_a

    def save(self, *args, **kwargs):
        self.full_clean()
        vehicle = self.transportation.vehicle
        skip_check = self._is_range_shrinking() or self.status in ("cancelled", "no_show")
        if vehicle and not skip_check:
            peak = self.transportation.max_occupancy_between(
                self.boarding_stop, self.alighting_stop
            )
            already_counted = 1 if (self.pk and self.status in ("reserved", "checked_in")) else 0
            if (peak - already_counted) + 1 > vehicle.capacity:
                b = self.boarding_stop.sequence if self.boarding_stop else "origin"
                a = self.alighting_stop.sequence if self.alighting_stop else "destination"
                raise ValidationError(
                    f"Cannot reserve seat from stop {b} to {a}: trip is at full "
                    f"capacity ({vehicle.capacity} seats) on that segment."
                )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.transportation.title})"