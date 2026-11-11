from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.db.models import Avg
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.apps import apps
from django.db.models.signals import post_save
from django.dispatch import receiver
import uuid
import os
from .core import *
from .catalogue import TourPackage
from .bookings import QRCode, Booking

class PermitType(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

# Permit Template and Permit
# =====================================================
class PermitTemplate(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    template_file = models.FileField(upload_to=random_filename)
   

    def __str__(self):
        return self.name

class Permit(BaseModel):
    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name="permit"
    )
    permit_type = models.ForeignKey(
        PermitType,
        on_delete=models.PROTECT,
        related_name="permits"
    )
    template = models.ForeignKey(
        PermitTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    generated_file = models.FileField(upload_to=random_filename, blank=True, null=True)
    permit_number = models.CharField(max_length=100, unique=True)
    issued_date = models.DateTimeField(default=timezone.now)
    expiry_date = models.DateTimeField(null=True, blank=True)
    

    def __str__(self):
        return f"{self.permit_number} ({self.permit_type.name})"


class Station(BaseModel):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    location = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Physical address or GPS coordinates"
    )
    staff = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="stations",
        limit_choices_to={"role": "station_staff"},
        help_text="Staff assigned to this station"
    )
    

    def __str__(self):
        return self.name


# =====================================================
# TourEvent
# =====================================================
class TourEvent(BaseModel):
    package = models.ForeignKey(
        TourPackage,
        on_delete=models.CASCADE,
        related_name="events"
    )
    start_date = models.DateField(default=timezone.localdate)
    end_date = models.DateField(default=timezone.localdate)

    slot_limit = models.PositiveIntegerField(default=20)
    @property
    def slots_used(self):
        BookingGuest = apps.get_model("api", "BookingGuest")
        return BookingGuest.objects.filter(
            booking__event=self
        ).count()


    is_group_event = models.BooleanField(default=True)
    requires_permit = models.BooleanField(default=False)
  
    required_qualification = models.ForeignKey(
        Qualification,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events"
        )
    
    required_permit_type = models.ForeignKey(
        PermitType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events"
    )

    stations = models.ManyToManyField(
        "Station",
        through="EventStation",
        blank=True,
        related_name="events",
        help_text="Stations included in this event's itinerary"
    )

    assigned_guide = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={"role": "tour_guide"},
        related_name="events_guiding"
    )

    active_itinerary = models.ForeignKey(
        "TourEventItinerary",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="active_for_events"
    )

    @property
    def slots_available(self):
        return max(self.slot_limit - self.slots_used, 0)

    @property
    def is_full(self):
        return self.slots_used >= self.slot_limit
    
    def save(self, *args, **kwargs):
        is_update = self.pk is not None
        super().save(*args, **kwargs)  # save the event first

        if is_update:
            # Propagate assigned guide & active itinerary to bookings
            if self.bookings.exists():
                updated_count = self.bookings.update(
                    assigned_guide=self.assigned_guide,
                    itinerary=self.active_itinerary
                )
                print(f"[DEBUG] Propagated event changes to {updated_count} bookings for Event {self.id}")

    def __str__(self):
        return f"{self.package.name}: {self.start_date} → {self.end_date}"

class TourEventItinerary(BaseModel):
    event = models.ForeignKey(
        TourEvent,
        on_delete=models.CASCADE,
        related_name="itineraries"
    )
    file = models.FileField(upload_to=random_filename)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={"role__in": ["staff", "admin"]}
    )
    

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)  # save the itinerary first

        # Update bookings only if this is the active itinerary
        if self.event.active_itinerary_id == self.pk:
            updated_count = self.event.bookings.update(itinerary=self)
   

    def __str__(self):
        return f"Itinerary for {self.event}"








class EventStationCheck(BaseModel):
    event = models.ForeignKey(
        TourEvent,
        on_delete=models.CASCADE,
        related_name="station_checks"
    )
    station = models.ForeignKey(
        Station,
        on_delete=models.CASCADE,
        related_name="event_checks"
    )

    checked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={"role": "station_staff"}
    )

    trigger_qr = models.ForeignKey(
        QRCode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    checked_at = models.DateTimeField(null=True, blank=True)
    checked_location = models.CharField(max_length=50, blank=True, null=True)

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("partial", "Partial"),
         ("MIA", "MIA"),
        ("complete", "Complete"),
    ]

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending"
    )

    def update_status(self):
            """
            Updates the status of this EventStationCheck based on guest checks
            and the guide check.
            """
            guest_checks = self.guest_checks.all()
            total_guests = guest_checks.count()
            checked_guests = guest_checks.filter(checked=True).count()

            guide_checked = hasattr(self, "guide_check") and self.guide_check.checked

            if total_guests == 0 and not guide_checked:
                self.status = "pending"
            elif total_guests > 0 and checked_guests == total_guests and guide_checked:
                self.status = "complete"
            elif checked_guests > 0 or guide_checked:
                self.status = "partial"
            else:
                self.status = "pending"

            self.save(update_fields=["status"])


 
    


    class Meta:
        unique_together = ("event", "station")
        indexes = [
            models.Index(fields=["event", "station"]),
        ]


        


class EventStationGuestCheck(BaseModel):
    event_station_check = models.ForeignKey("EventStationCheck", on_delete=models.CASCADE, related_name="guest_checks")

    booking_guest = models.ForeignKey("BookingGuest", on_delete=models.CASCADE)

    checked = models.BooleanField(default=False)

    checked_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)

    checked_at = models.DateTimeField(null=True, blank=True)

    # 🔥 Google Maps Ready
    checked_latitude = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    checked_longitude = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)


class EventStationGuideCheck(BaseModel):
    event_station_check = models.OneToOneField(
        EventStationCheck,
        on_delete=models.CASCADE,
        related_name="guide_check"
    )

    guide = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "tour_guide"}
    )

    checked = models.BooleanField(default=False)

    checked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={"role": "station_staff"},
        related_name="guide_confirmations"
    )

    checked_at = models.DateTimeField(null=True, blank=True)
    checked_location = models.CharField(max_length=50, blank=True, null=True)


    def clean(self):
        if self.guide != self.event_station_check.event.assigned_guide:
            raise ValidationError(
                "Guide must match the event's assigned guide."
            )

@receiver(post_save, sender=EventStationGuestCheck)
def update_station_check_after_guest(sender, instance, **kwargs):
    instance.event_station_check.update_status()


@receiver(post_save, sender=EventStationGuideCheck)
def update_station_check_after_guide(sender, instance, **kwargs):
    instance.event_station_check.update_status()

class EventStation(BaseModel):
    event = models.ForeignKey(
        TourEvent,
        on_delete=models.CASCADE,
        related_name="event_stations"
    )
    station = models.ForeignKey(
        Station,
        on_delete=models.CASCADE,
        related_name="station_events"
    )
    order = models.PositiveIntegerField()

    class Meta:
        unique_together = ("event", "station")
        ordering = ["order"]

    def __str__(self):
        return f"{self.event} → {self.station} ({self.order})"
