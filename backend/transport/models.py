from django.db import models
from api.models import BaseModel
from django.core.validators import MinValueValidator, MaxValueValidator


class Transportation(BaseModel):

    STATUS_CHOICES = [
        ("Scheduled", "Scheduled"),
        ("Departed", "Departed"),
        ("Cancelled", "Cancelled"),
        ("Completed", "Completed"),
    ]


    category = models.CharField(max_length=100)
    sub_category = models.CharField(max_length=100, blank=True, null=True)
    categorydesc = models.TextField(blank=True, null=True)
    title = models.CharField(max_length=200)
    desc = models.TextField(blank=True, null=True)

    vehicle_name=models.CharField(max_length=200)
    plate_number=models.CharField(max_length=200)
    capacity =models.IntegerField(validators=[
            MinValueValidator(1),
            MaxValueValidator(50)
        ])
    driver =models.CharField(max_length=200)
    owner=models.CharField(max_length=200)
    affiliate=models.CharField(max_length=200)
    schedule=models.DateTimeField()
    pickup_location=models.CharField(max_length=200)
    dropoff_location=models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, blank=True, null=True)
    


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

    vehicle_name=models.CharField(max_length=200)
    plate_number=models.CharField(max_length=200)
    capacity =models.IntegerField(validators=[
            MinValueValidator(1),
            MaxValueValidator(50)
        ])
    driver =models.CharField(max_length=200)
    owner=models.CharField(max_length=200)
    affiliate=models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, blank=True, null=True)
  