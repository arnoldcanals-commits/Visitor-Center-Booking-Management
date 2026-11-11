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




class DashboardHero(models.Model):
    """Text content for the dashboard hero. The newest active row is served."""

    title = models.CharField(max_length=120)
    subtitle = models.TextField(blank=True)
    cta_label = models.CharField(max_length=40, blank=True)
    cta_url = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title


class DashboardImage(models.Model):
    hero = models.ForeignKey(
        DashboardHero, related_name="images", on_delete=models.CASCADE
    )
    image = models.ImageField(upload_to="dashboard/")
    alt = models.CharField(max_length=140, blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.hero_id} / {self.order}"