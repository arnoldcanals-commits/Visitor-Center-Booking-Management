from api.models import Booking, BookingGuest
from billing.models import Bill, BillItem
import logging

logger = logging.getLogger(__name__)

from django.utils import timezone
from api.models import Booking
from billing.models import Bill, BillItem


def create_bill_from_booking(booking: Booking) -> Bill:
    """
    Creates a professional tourism receipt for Sablayan Visitor Center.

    Receipt structure:
    - Official header (office name + address)
    - Receipt metadata (number, date/time)
    - Itemized charges (package + optional fees)
    - Guest count summary
    - Total amount due
    """

    if not booking.package:
        raise ValueError("Booking must have a package")

    # Idempotency: return existing bill
    if hasattr(booking, "bill"):
        return booking.bill

    issued_at = timezone.now()
    guest_count = booking.booking_guests.count()

    bill = Bill.objects.create(
        booking=booking,
        base_amount=booking.package.base_price,
        total_amount=0,
        status="draft",
        issued_at=issued_at,
    )

    running_total = 0

    # =====================================================
    # HEADER (non-monetary, purely informational)
    # =====================================================
    BillItem.objects.create(
        bill=bill,
        item_type="header",
        description=(
            "SABLAYAN VISITOR CENTER\n"
            "Municipality of Sablayan\n"
            "Poblacion, Sablayan, Occidental Mindoro\n\n"
            f"Receipt No.: {bill.id}\n"
            f"Date Issued : {issued_at.strftime('%B %d, %Y')}\n"
            f"Time        : {issued_at.strftime('%I:%M %p')}"
        ),
        base_amount=0,
        discount_amount=0,
        final_amount=0,
    )

    # =====================================================
    # MAIN SERVICE / PACKAGE
    # =====================================================
    BillItem.objects.create(
        bill=bill,
        item_type="package",
        description=f"Tour Package: {booking.package.name}",
        base_amount=booking.package.base_price,
        discount_amount=0,
        final_amount=booking.package.base_price,
    )
    running_total += booking.package.base_price

    # Optional package description (digest)
    if getattr(booking.package, "digest", None):
        BillItem.objects.create(
            bill=bill,
            item_type="note",
            description=f"Details: {booking.package.digest}",
            base_amount=0,
            discount_amount=0,
            final_amount=0,
        )

    # =====================================================
    # OPTIONAL FEES (only if present)
    # =====================================================
    extra_fees = [
        ("environmental_fee", "Environmental / Eco‑Tourism Fee"),
        ("guide_fee", "Tour Guide Service Fee"),
    ]

    for field, label in extra_fees:
        amount = getattr(booking.package, field, None)
        if amount:
            BillItem.objects.create(
                bill=bill,
                item_type="fee",
                description=label,
                base_amount=amount,
                discount_amount=0,
                final_amount=amount,
            )
            running_total += amount

    # =====================================================
    # GUEST SUMMARY (no per-guest listing)
    # =====================================================
    BillItem.objects.create(
        bill=bill,
        item_type="summary",
        description=f"Number of Guests: {guest_count}",
        base_amount=0,
        discount_amount=0,
        final_amount=0,
    )

    # =====================================================
    # TOTAL
    # =====================================================
    BillItem.objects.create(
        bill=bill,
        item_type="total",
        description="TOTAL AMOUNT DUE",
        base_amount=0,
        discount_amount=0,
        final_amount=running_total,
    )

    bill.total_amount = running_total
    bill.status = "ready"
    bill.save(update_fields=["total_amount", "status"])

    return bill
