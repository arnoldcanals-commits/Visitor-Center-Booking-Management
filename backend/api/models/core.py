from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import  RegexValidator
from django.utils import timezone
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
        ("driver", "Driver"),
        ("ranger", "Ranger"),
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
    darkMode=models.BooleanField(default=False)
    themeColor=models.CharField(default="#3b82f6")

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

