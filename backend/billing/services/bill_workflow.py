from django.utils import timezone
from .bill_pdf import attach_bill_pdf
from billing.utils import generate_gcash_qr
import logging

logger = logging.getLogger(__name__)


def issue_bill(bill):
    logger.info("ISSUE_BILL ENTERED bill=%s status=%s", bill.pk, bill.status)

    if bill.status != "draft":
        raise ValueError("Only draft bills can be issued")

    # 1️⃣ Finalize totals (includes BookingGuest count)
    bill.recalculate_total(commit=True)

    # 2️⃣ Ensure reference number (Bill.save() auto-generates if missing)
    if not bill.reference_no:
        bill.save(update_fields=["reference_no"])

    # 3️⃣ Generate GCash QR if missing
    if not bill.qr_code:
        bill.qr_code = generate_gcash_qr(bill)
        bill.save(update_fields=["qr_code"])

    # 4️⃣ Update bill status
    bill.status = "issued"
    bill.issued_at = timezone.now()
    bill.save(update_fields=["status", "issued_at"])

    logger.info("QR generated: %s path=%s", bool(bill.qr_code), getattr(bill.qr_code, "path", None))

    # 5️⃣ Generate official PDF document
    attach_bill_pdf(bill)
