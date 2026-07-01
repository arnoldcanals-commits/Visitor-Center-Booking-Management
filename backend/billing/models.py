from django.db import models
from django.utils import timezone
from api.models import Booking, BookingGuest
import uuid, os
import logging

logger = logging.getLogger(__name__)


def random_filename(instance, filename):
    ext = os.path.splitext(filename)[1]
    return f"{uuid.uuid4().hex}{ext}"


# =====================================================
# Templates & Fee Types
# =====================================================
class BillTemplate(models.Model):
    name = models.CharField(max_length=100)
    template_file = models.FileField(upload_to=random_filename)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class FeeType(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    default_amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


# =====================================================
# Bill
# =====================================================
class Bill(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("issued", "Issued"),
        ("paid", "Paid"),
        ("verified", "Verified"),
        ("rejected", "Rejected"),
    ]

    VALID_TRANSITIONS = {
        "draft": {"issued"},
        "issued": {"paid", "rejected"},
        "paid": {"verified"},
        "verified": set(),
        "rejected": set(),
    }

    STATUS_TIMESTAMP_FIELD = {
        "issued": "issued_at",
        "paid": "paid_at",
        "verified": "verified_at",
        "rejected": "rejected_at",
    }

    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name="bill"
    )

    template = models.ForeignKey(
        BillTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bills"
    )

    base_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")

    issued_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)

    bill_document = models.FileField(upload_to=random_filename, blank=True, null=True)
    transaction_image = models.ImageField(upload_to=random_filename, blank=True, null=True)
    transaction_number = models.CharField(max_length=255, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    reference_no = models.CharField(
        max_length=50,
        unique=True,
        editable=False
    )

    qr_code = models.ImageField(upload_to="bill_qr/", null=True, blank=True)

    payment_method = models.CharField(max_length=20, default="gcash")
    payment_status = models.CharField(max_length=20, default="unpaid")

    # ------------------------------
    # Save
    # ------------------------------
    def save(self, *args, **kwargs):
        is_new = self.pk is None

        # Generate reference number once
        if not self.reference_no:
            self.reference_no = f"BILL-{uuid.uuid4().hex[:10].upper()}"

        old_status = None
        if not is_new:
            old_status = (
                Bill.objects
                .filter(pk=self.pk)
                .values_list("status", flat=True)
                .first()
            )

        # Status validation
        if old_status and self.status != old_status:
            allowed = self.VALID_TRANSITIONS.get(old_status, set())
            if self.status not in allowed:
                raise ValueError(
                    f"Invalid bill status transition: {old_status} → {self.status}"
                )

        # Status timestamp handling
        timestamp_field = None
        if old_status and self.status != old_status:
            timestamp_field = self.STATUS_TIMESTAMP_FIELD.get(self.status)
            if timestamp_field and getattr(self, timestamp_field) is None:
                setattr(self, timestamp_field, timezone.now())

        # Initial base amount (BEFORE save so instance stays correct)
        if is_new and self.booking and getattr(self.booking, "package", None):
            self.base_amount = self.booking.package.base_price
            self.total_amount = self.booking.package.base_price

        # Ensure timestamps are saved even with update_fields
        update_fields = kwargs.get("update_fields")
        if update_fields and timestamp_field:
            kwargs["update_fields"] = set(update_fields) | {timestamp_field}

        super().save(*args, **kwargs)

    # ------------------------------
    # Domain actions
    # ------------------------------
    def issue(self):
        if self.status != "draft":
            raise ValueError("Only draft bills can be issued")

        from billing.services.bill_workflow import issue_bill
        issue_bill(self)

    def mark_paid(self):
        if self.status != "issued":
            raise ValueError("Bill must be issued before payment")
        self.status = "paid"
        self.save(update_fields=["status"])

    def verify(self):
        if self.status != "paid":
            raise ValueError("Bill must be paid before verification")
        self.status = "verified"
        self.save(update_fields=["status"])

    def reject(self):
        if self.status not in {"draft", "issued"}:
            raise ValueError("Only draft or issued bills can be rejected")
        self.status = "rejected"
        self.save(update_fields=["status"])

    # ------------------------------
    # Recalculate total
    # ------------------------------
    def recalculate_total(self, commit=True):
        if self.status != "draft":
            return self.total_amount

        # Count booking guests instead of direct guests
        guest_count = max(self.booking.booking_guests.count(), 1)

        items_total = self.items.aggregate(
            total=models.Sum("final_amount")
        )["total"] or 0

        new_total =  items_total

        if commit:
            Bill.objects.filter(pk=self.pk).update(total_amount=new_total)

        return new_total

    def __str__(self):
        return f"Bill #{self.id} – Booking {self.booking.id}"


# =====================================================
# Bill Items
# =====================================================
class BillItem(models.Model):
    ITEM_TYPE_CHOICES = [
        ("guest", "Guest Charge"),
        ("fee", "Additional Fee"),
    ]

    bill = models.ForeignKey(
        Bill,
        on_delete=models.CASCADE,
        related_name="items"
    )

    item_type = models.CharField(
        max_length=10,
        choices=ITEM_TYPE_CHOICES,
        default="guest"
    )

    booking_guest = models.ForeignKey(
        BookingGuest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="billing_items"
    )

    fee_type = models.ForeignKey(
        FeeType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    description = models.CharField(max_length=255, blank=True)
    base_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    final_amount = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    created_at = models.DateTimeField(auto_now_add=True)

    # ------------------------------
    # Save
    # ------------------------------
    def save(self, *args, **kwargs):
        is_new = self.pk is None

        # Enforce booking_guest belongs to bill's booking
        if self.item_type == "guest" and self.booking_guest:
            if self.booking_guest.booking_id != self.bill.booking_id:
                raise ValueError("Guest does not belong to this bill’s booking")

            self.description = f"Charge for {self.booking_guest.guest.full_name}"
            self.base_amount = self.bill.base_amount if self.base_amount is None else self.base_amount

        if self.item_type == "fee" and self.fee_type:
            self.description = self.fee_type.name
            self.base_amount = self.fee_type.default_amount

        if self.base_amount is None:
            self.base_amount = 0

        base = self.base_amount or 0
        self.final_amount = max(base - self.discount_amount, 0)

        super().save(*args, **kwargs)

        if is_new:
            self.bill.recalculate_total(commit=True)

    def __str__(self):
        return f"{self.description} – {self.final_amount}"
