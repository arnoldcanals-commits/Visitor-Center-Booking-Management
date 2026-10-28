import uuid
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from api.models import BaseModel, User


class Accommodation(BaseModel):

    TYPE_CHOICES = [
        ("hotel", "Hotel"),
        ("apartment", "Apartment"),
        ("house", "House"),
        ("hostel", "Hostel"),
        ("resort", "Resort"),
        ("villa", "Villa"),
        ("guest_house", "Guest House"),
        ("homestay", "Homestay"),
        ("beach_house", "Beach House"),
        ("camping_site", "Camping Site"),
    ]

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("published", "Published"),
    ]

    reference_number = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        blank=True,
    )

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="accommodations",
    )
    name = models.CharField(max_length=255)
    description = models.TextField()
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    check_in_time = models.TimeField()
    check_out_time = models.TimeField()
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    website = models.URLField(blank=True)
    rating_average = models.PositiveIntegerField(default=0)

    def save(self, *args, **kwargs):
        if not self.reference_number:
            self.reference_number = f"ACC-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference_number} - {self.name}"


class AccommodationImage(BaseModel):

    accommodation = models.ForeignKey(
        Accommodation,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ImageField(upload_to="accommodations/images/")
    caption = models.CharField(max_length=100, blank=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["display_order"]

    def __str__(self):
        return f"Image for {self.accommodation.name} ({self.display_order})"


class RoomType(BaseModel):

    BED_TYPE_CHOICES = [
        ("single", "Single"),
        ("double", "Double"),
        ("queen", "Queen"),
        ("king", "King"),
        ("bunk", "Bunk"),
        ("sofa_bed", "Sofa Bed"),
    ]

    accommodation = models.ForeignKey(
        Accommodation,
        on_delete=models.CASCADE,
        related_name="room_types",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    max_guests = models.PositiveIntegerField()
    bed_type = models.CharField(max_length=20, choices=BED_TYPE_CHOICES)
    bed_count = models.PositiveIntegerField(default=1)
    room_size = models.DecimalField(
        max_digits=6, decimal_places=2, help_text="Size in square meters"
    )
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    bathrooms = models.PositiveIntegerField(default=1)
    has_private_bathroom = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} - {self.accommodation.name}"


class RoomImage(BaseModel):

    room_type = models.ForeignKey(
        RoomType,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ImageField(upload_to="room_types/images/")

    def __str__(self):
        return f"Image for {self.room_type.name}"


class Amenity(BaseModel):

    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(
        max_length=50,
        blank=True,
        help_text="Icon identifier, e.g. an icon library class name",
    )

    class Meta:
        verbose_name_plural = "Amenities"

    def __str__(self):
        return self.name


class AccommodationAmenity(BaseModel):

    accommodation = models.ForeignKey(
        Accommodation,
        on_delete=models.CASCADE,
        related_name="amenities",
    )
    amenity = models.ForeignKey(
        Amenity,
        on_delete=models.CASCADE,
        related_name="accommodations",
    )

    class Meta:
        unique_together = ("accommodation", "amenity")
        verbose_name_plural = "Accommodation amenities"

    def __str__(self):
        return f"{self.accommodation.name} - {self.amenity.name}"


class Booking(BaseModel):

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("checked_in", "Checked In"),
        ("checked_out", "Checked Out"),
        ("cancelled", "Cancelled"),
        ("no_show", "No Show"),
    ]

    booking_reference = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        blank=True,
    )

    guest = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="accomodation_bookings",
    )
    accommodation = models.ForeignKey(
        Accommodation,
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    room_type = models.ForeignKey(
        RoomType,
        on_delete=models.CASCADE,
        related_name="bookings",
    )

    check_in = models.DateField()
    check_out = models.DateField()

    adults = models.PositiveIntegerField(default=1)
    children = models.PositiveIntegerField(default=0)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    special_requests = models.TextField(blank=True)


    def save(self, *args, **kwargs):
        if not self.booking_reference:
            self.booking_reference = f"BKG-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.booking_reference} - {self.guest}"


class BookingGuest(BaseModel):

    ID_TYPE_CHOICES = [
        ("passport", "Passport"),
        ("national_id", "National ID"),
        ("drivers_license", "Driver's License"),
    ]

    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name="guests",
    )
    full_name = models.CharField(max_length=255)
    age = models.PositiveIntegerField(validators=[MaxValueValidator(120)])
    id_type = models.CharField(max_length=20, choices=ID_TYPE_CHOICES)
    id_number = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.full_name} ({self.booking.booking_reference})"


class Availability(BaseModel):

    room_type = models.ForeignKey(
        RoomType,
        on_delete=models.CASCADE,
        related_name="availability",
    )
    date = models.DateField()
    available_rooms = models.PositiveIntegerField()

    class Meta:
        unique_together = ("room_type", "date")
        verbose_name_plural = "Availability"

    def __str__(self):
        return f"{self.room_type.name} - {self.date}"


class Promotion(BaseModel):

    DISCOUNT_TYPE_CHOICES = [
        ("percentage", "Percentage"),
        ("fixed", "Fixed Amount"),
    ]

    accommodation = models.ForeignKey(
        Accommodation,
        on_delete=models.CASCADE,
        related_name="promotions",
    )
    title = models.CharField(max_length=255)
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES)
    discount_value = models.DecimalField(max_digits=8, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField()
    active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.title} - {self.accommodation.name}"