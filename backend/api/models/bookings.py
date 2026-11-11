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
from .core import BaseModel, random_filename
from .catalogue import Activity, TourPackage

# =====================================================
# Booking & Guests
# =====================================================
class Booking(BaseModel):
    STATUS_CHOICES = [ ("pending", "Pending"), ("approved", "Approved"), ("active", "Active"), ("rejected", "Rejected"), ("cancelled", "Cancelled"), ("completed", "Completed"), ] 
    tourist = models.ForeignKey( settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookings" ) 
    package = models.ForeignKey( TourPackage, on_delete=models.SET_NULL, null=True, blank=True, related_name="bookings" ) 
    event = models.ForeignKey( "TourEvent", on_delete=models.CASCADE, related_name="bookings", null=True, blank=True ) 
    check_in = models.DateTimeField(default=timezone.now) 
    check_out = models.DateTimeField(null=True, blank=True) 
    booking_date = models.DateTimeField(auto_now_add=True) 
    status = models.CharField( max_length=20, choices=STATUS_CHOICES, default="pending" ) 
    assigned_guide = models.ForeignKey( settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_bookings", limit_choices_to={"role": "tour_guide"}, editable=False) 
    requested_cancellation=models.BooleanField(default=False)
    
    read_byStaff =models.BooleanField(default=False)
    read_byGuide=models.BooleanField(default=False)
    itinerary = models.ForeignKey(
        "TourEventItinerary",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        editable=False
    )

    selected_activities = models.ManyToManyField(
        Activity,
        blank=True,
        related_name="bookings"
    )

    @property
    def guests(self):
        return [
            bg.guest
            for bg in self.booking_guests.select_related("guest")
        ]

    def __str__(self): 
        return f"Booking {self.id} by {self.tourist.username} ({self.status})" 
    
    def clean(self):
        super().clean()

        if self.event is None:
            if self.assigned_guide or self.itinerary:
                raise ValidationError(
                    "Detached bookings cannot have a guide or itinerary."
                )
        if self.assigned_guide and (
            not self.event or self.assigned_guide != self.event.assigned_guide
        ):
            raise ValidationError(
                "Booking guide must come from its event."
            )

        if self.itinerary and (
            not self.event or self.itinerary != self.event.active_itinerary
        ):
            raise ValidationError(
                "Booking itinerary must come from its event."
            )

        if self.pk and self.package:
            invalid = self.selected_activities.exclude(package=self.package)
            if invalid.exists():
                raise ValidationError(
                    "Selected activities must belong to the booked package."
                )

    def auto_update_status(self):
        now = timezone.now()

        if (
            self.check_in
            and self.status == "approved"
            and now >= self.check_in
            and (not self.check_out or now < self.check_out)
        ):
            self.status = "active"

        if self.check_out and now >= self.check_out:
            if self.status in ("approved", "active"):
                self.status = "completed"
            elif self.status == "pending":
                self.status = "rejected"

    def update_guide_status(self):
        if not self.assigned_guide:
            return

        guide = self.assigned_guide

        if self.status in ("approved", "active"):
            guide.status = "busy"
        elif self.status in ("completed", "cancelled", "rejected"):
            guide.status = "available"

        guide.save(update_fields=["status"])

    def save(self, *args, **kwargs):
        if self.event:
            self.assigned_guide = self.event.assigned_guide
            self.itinerary = self.event.active_itinerary
        else:
            # If detached from event → wipe derived fields
            self.assigned_guide = None
            self.itinerary = None

        previous_status = None

        if self.pk:
            previous_status = (
                Booking.objects
                .filter(pk=self.pk)
                .values_list("status", flat=True)
                .first()
            )

        self.auto_update_status()
        super().save(*args, **kwargs)

        if previous_status != self.status:
            self.update_guide_status()




class Guest(BaseModel):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_guests",
        null=True,
        blank=True
    )

    full_name = models.CharField(max_length=100)
    age = models.PositiveIntegerField(validators=[MinValueValidator(0)])
    gender = models.CharField(max_length=10)

    id_number = models.CharField(max_length=50, blank=True, null=True)
    id_document = models.FileField(upload_to=random_filename, blank=True, null=True)

    local = models.BooleanField(default=False)

    class Meta:
        constraints = [
        models.UniqueConstraint(
            fields=["owner", "full_name", "id_number"],
            condition=models.Q(is_active=True),
            name="unique_active_guest",
        )
    ]

    def save(self, *args, **kwargs):
        if self.pk:
            old = Guest.objects.filter(pk=self.pk).first()
            if old and old.id_document != self.id_document:
                # ID changed → remove local verification
                self.local = False

        super().save(*args, **kwargs)

    def __str__(self):
        return self.full_name

class BookingGuest(BaseModel):
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name="booking_guests"
    )

    guest = models.ForeignKey(
        Guest,
        on_delete=models.CASCADE,
        related_name="booking_instances"
    )

   

    def clean(self):
        if not self.booking_id or not self.guest_id:
            return

        # Admin/staff bypass
        if self.booking.tourist.is_staff or self.booking.tourist.is_superuser:
            return

        if self.guest.owner and self.booking.tourist != self.guest.owner:
            raise ValidationError(
                "You can only add your own guests to a booking."
            )

    class Meta:
        unique_together = ("booking", "guest")
        indexes = [
            models.Index(fields=["booking"]),
            models.Index(fields=["guest"]),
        ]

    def __str__(self):
        return f"{self.guest.full_name} → Booking {self.booking.id}"

# =====================================================
# QRCode
# =====================================================

class QRCode(BaseModel):
    booking_guest = models.OneToOneField(
        "BookingGuest",
        on_delete=models.CASCADE,
        related_name="qrcode"
    )

    code = models.CharField(
        max_length=64,
        unique=True,
        editable=False
    )



    def __str__(self):
        bg = self.booking_guest
        return f"QR → {bg.guest.full_name} (Booking {bg.booking.id})"


# =====================================================
# Auto-generate QR when BookingGuest is created
# =====================================================

@receiver(post_save, sender="api.BookingGuest")
def create_qr_for_booking_guest(sender, instance, created, **kwargs):
    """
    Automatically create a QRCode for a BookingGuest the moment
    the BookingGuest is created.
    """
    if created:
        QRCode.objects.create(
            booking_guest=instance,
            code=uuid.uuid4().hex
        )

# ==
# =====================================================
# Review
# =====================================================

class Review(BaseModel):
    TARGET_CHOICES = [
        ("package", "Tour Package"),
        ("guide", "Tour Guide"),
        ("site", "Visitor Center"),
    ]

    booking = models.ForeignKey("Booking", on_delete=models.CASCADE, related_name="reviews")
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    target_type = models.CharField(max_length=20, choices=TARGET_CHOICES)

    package = models.ForeignKey("TourPackage", null=True, blank=True, on_delete=models.CASCADE)
    tour_guide = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name="guide_reviews")

    rating = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["booking", "reviewer", "target_type"],
                name="unique_review_per_target"
            )
        ]

    def clean(self):
        if self.booking.status != "completed":
            raise ValidationError("Can only review completed bookings.")

        if self.target_type == "package" and not self.package:
            raise ValidationError("Package must be provided.")

        if self.target_type == "guide" and not self.tour_guide:
            raise ValidationError("Guide must be provided.")

        if self.target_type == "site" and (self.package or self.tour_guide):
            raise ValidationError("Site review cannot include package or guide.")

    def __str__(self):
        return f"{self.rating}/5 - {self.target_type}"
