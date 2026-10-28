from django.db import models
from django.conf import settings
from api.models import Guest, BaseModel
class PermitTemplate(BaseModel):
    name = models.CharField(max_length=100)
    file = models.FileField(upload_to="permit_templates/")
    

    def __str__(self):
        return f"{self.name} ({'active' if self.is_active else 'inactive'})"


class Permit(BaseModel):
    STATUS_CHOICES = [
        ("pending_payment", "Pending Payment"),
        ("paid", "Paid"),
        ("generated", "Generated"),
        ("signed", "Signed"),
    ]

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="permits",
        null=True,
        blank=True,
    )
    guests = models.ManyToManyField("api.Guest", related_name="permits")
    template = models.ForeignKey(PermitTemplate, on_delete=models.PROTECT)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending_payment")
    generated_pdf = models.FileField(upload_to="permits/", blank=True, null=True)

    fee_amount = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    payment_reference = models.CharField(max_length=100, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    signed_at = models.DateTimeField(null=True, blank=True)
    signed_by = models.CharField(max_length=255, blank=True)  # name of the head who signed on site

  

    def __str__(self):
        return f"Permit #{self.id} ({self.status})"