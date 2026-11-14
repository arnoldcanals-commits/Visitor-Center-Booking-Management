from django.utils import timezone
from .bill_pdf import attach_bill_pdf
from billing.utils import generate_gcash_qr
from billing.models import BillItem
import logging

logger = logging.getLogger(__name__)


def sync_booking_bill_items(bill):
    activities = bill.booking.selected_activities.all()
    guests = bill.booking.booking_guests.select_related("guest")

    for booking_guest in guests:
        if bill.booking.package and not BillItem.objects.filter(
            bill=bill,
            booking_guest=booking_guest,
            item_type="guest",
        ).exists():
            BillItem.objects.create(
                bill=bill,
                booking_guest=booking_guest,
                item_type="guest",
                base_amount=bill.base_amount,
                discount_amount=0,
            )

        for activity in activities:
            BillItem.objects.get_or_create(
                bill=bill,
                booking_guest=booking_guest,
                activity=activity,
                item_type="activity",
                defaults={
                    "description": activity.name,
                    "base_amount": activity.extra_price,
                    "discount_amount": 0,
                },
            )


def issue_bill(bill):
    logger.info("ISSUE_BILL ENTERED bill=%s status=%s", bill.pk, bill.status)

    if bill.status != "draft":
        raise ValueError("Only draft bills can be issued")

    # 1. Add package and selected activities as per-guest line items.
    sync_booking_bill_items(bill)

    # 2. Finalize totals.
    bill.recalculate_total(commit=True)

    # 3. Ensure reference number (Bill.save() auto-generates if missing).
    if not bill.reference_no:
        bill.save(update_fields=["reference_no"])

    # 4. Generate GCash QR if missing.
    if not bill.qr_code:
        bill.qr_code = generate_gcash_qr(bill)
        bill.save(update_fields=["qr_code"])

    # 5. Update bill status.
    bill.status = "issued"
    bill.issued_at = timezone.now()
    bill.save(update_fields=["status", "issued_at"])

    logger.info("QR generated: %s", bool(bill.qr_code))

    # 6. Generate official PDF document.
    attach_bill_pdf(bill)
