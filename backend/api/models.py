#models.py
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


# =====================================================
# BASE MODEL (Soft Delete + Audit Ready)
# =====================================================

class BaseModel(models.Model):
    is_active = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        self.is_active = False
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_active", "deleted_at"])

    def hard_delete(self):
        super().delete()



# =====================================================
# Helper: Randomized filenames
# =====================================================
def random_filename(instance, filename):
    ext = os.path.splitext(filename)[1]
    return f"{uuid.uuid4().hex}{ext}"


from django.contrib.auth.base_user import BaseUserManager

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if not extra_fields.get("is_staff"):
            raise ValueError("Superuser must have is_staff=True.")
        if not extra_fields.get("is_superuser"):
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser, BaseModel):
    ROLE_CHOICES = [
        ("tourist", "Tourist"),
        ("tour_guide", "Tour Guide"),
        ("staff", "Staff"),
        ("station_staff", "Station Staff"),
        ("admin", "Admin"),
    ]

    STATUS_CHOICES = [
        ("available", "Available"),
        ("busy", "Busy"),
        ("on_leave", "On Leave"),
    ]

    email = models.EmailField(unique=True)
    is_email_verified = models.BooleanField(default=False)
    profile_picture = models.ImageField(
        upload_to=random_filename,
        blank=True,
        null=True
)

    phone_number = models.CharField(
        max_length=15,
        unique=True,
        blank=True,
        null=True,
        validators=[RegexValidator(r'^\+?\d{7,15}$')]
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="tourist")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, blank=True, null=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    objects = UserManager()

    def __str__(self):
        return f"{self.username} ({self.role})"



class Qualification(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


User.add_to_class(
    "qualifications",
    models.ManyToManyField(
        Qualification,
        blank=True,
        related_name="tour_guides",
     
    )
)

class PermitType(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

# =====================================================
# TourPackage & Images
# =====================================================
class TourPackage(BaseModel):
    name = models.CharField(max_length=100)
    short_description = models.CharField(max_length=255, blank=True, null=True)
    digest = models.TextField()
    description = models.TextField()
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    requires_permit = models.BooleanField(default=False)
  

    def __str__(self):
        return self.name

class TourPackageImage(BaseModel):
    package = models.ForeignKey(
        TourPackage,
        related_name="images",
        on_delete=models.CASCADE
    )

    image = models.ImageField(upload_to=random_filename)

    is_main = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["package"],
                condition=models.Q(is_main=True),
                name="unique_main_image_per_package"
            )
        ]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        # If this is set as main, unset others
        if self.is_main:
            TourPackageImage.objects.filter(
                package=self.package,
                is_main=True
            ).exclude(pk=self.pk).update(is_main=False)

    def __str__(self):
        return f"Image for {self.package.name}"

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
   
    
    read_byStaff =models.BooleanField(default=False)
    read_byGuide=models.BooleanField(default=False)
    itinerary = models.ForeignKey(
        "TourEventItinerary",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        editable=False
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
        unique_together = ("owner", "full_name", "id_number")

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

# =====================================================
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

# =====================================================
# SystemSetting
# =====================================================
class SystemSetting(BaseModel):
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
   

    def __str__(self):
        return self.key

# =====================================================
# Reports
# =====================================================
class Report(BaseModel):
    title = models.CharField(max_length=255, blank=True, null=True)
    file = models.FileField(upload_to=random_filename)
 
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_reports"
    )

    def __str__(self):
        return self.title or f"Report {self.id}"

# =====================================================
# Notifications
# =====================================================
class Notification(BaseModel):
    TYPE_CHOICES = [
        ("booking", "Booking"),
        ("permit", "Permit"),
        ("review", "Review"),
        ("system", "System"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")

    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField()

    related_booking = models.ForeignKey("Booking", on_delete=models.SET_NULL, null=True, blank=True)

    target_url = models.CharField(max_length=255, blank=True, null=True)

    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    def mark_as_read(self):
        self.is_read = True
        self.read_at = timezone.now()
        self.save(update_fields=["is_read", "read_at"])

    def __str__(self):
        return f"{self.user.email} - {self.title}"

# =====================================================
# Audit / Change Log
# =====================================================
# =====================================================
# AUDIT LOG (Auto Logging)
# =====================================================

class AuditLog(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.CharField(max_length=255)
    content_object = GenericForeignKey("content_type", "object_id")

    action = models.CharField(max_length=50)
    changes = models.JSONField(blank=True, null=True)

   


@receiver(post_save)
def auto_audit(sender, instance, created, **kwargs):
    if not issubclass(sender, BaseModel):
     return

    if sender == AuditLog:
        return

    AuditLog.objects.create(
        content_type=ContentType.objects.get_for_model(sender),
        object_id=str(instance.pk),
        action="created" if created else "updated"
    )



class SiteConfiguration(BaseModel):
    """
    Stores global site settings like social links and 'About' text.
    """
    website_name = models.CharField(max_length=255, default="My Website")
    about_us = models.TextField(help_text="The main bio displayed on the about page.")
    
    # Social Media Links
    twitter_url = models.URLField(blank=True, null=True)
    facebook_url = models.URLField(blank=True, null=True)
    instagram_url = models.URLField(blank=True, null=True)
    youtube_url = models.URLField(blank=True, null=True)
    tiktok_url = models.URLField(blank=True, null=True)
    
    # Contact Info
    contact_email = models.EmailField(blank=True, null=True)

    class Meta:
        verbose_name = "Site Configuration"
        verbose_name_plural = "Site Configuration"

    def __str__(self):
        return self.website_name


class FAQ(BaseModel):
    """
    Stores individual Question and Answer pairs.
    """
    question = models.CharField(max_length=500)
    answer = models.TextField()
    is_active = models.BooleanField(default=True, help_text="Uncheck this to hide the FAQ without deleting it.")
    order = models.PositiveIntegerField(default=0, help_text="Used to sort the FAQs on the page.")

    class Meta:
        ordering = ['order']
        verbose_name = "FAQ"
        verbose_name_plural = "FAQs"

    def __str__(self):
        return self.question
    

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

# =====================================================
# Information
# =====================================================
class Information(BaseModel):
    category = models.CharField(max_length=100)
    sub_category = models.CharField(max_length=100, blank=True, null=True)
    categorydesc = models.TextField(blank=True, null=True)
    title = models.CharField(max_length=200)
    desc = models.TextField(blank=True, null=True)
  

    image = models.ImageField(
        upload_to=random_filename,
        blank=True,
        null=True
    )
    class Meta:
        verbose_name = "Information"
        verbose_name_plural = "Information"
        ordering = ["category", "sub_category", "title"]

    def __str__(self):
        return f"{self.category} → {self.sub_category or 'General'}: {self.title}"

