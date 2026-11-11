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

class TourPackage(BaseModel):
    name = models.CharField(max_length=100)
    short_description = models.CharField(max_length=255, blank=True, null=True)
    digest = models.TextField()
    description = models.TextField()
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    requires_permit = models.BooleanField(default=False)
  

    def __str__(self):
        return self.name



# =====================================================
# Activities (per TourPackage)
# =====================================================
class Activity(BaseModel):
    package = models.ForeignKey(
        TourPackage,
        on_delete=models.CASCADE,
        related_name="activities"
    )
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, null=True)
    extra_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.package.name})"



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
