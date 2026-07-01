from decimal import Decimal
from django.utils import timezone
from django.template.loader import render_to_string
from django.core.files.base import ContentFile
from weasyprint import HTML
from ..models import Bill, BillItem, FeeType, Booking, Guest, BillTemplate, AuditLog

# =====================================================
# Create Draft Bill for a Booking
# =====================================================
def create_draft_bill(booking: Booking, template: BillTemplate = None):
    bill = Bill.objects.create(
        user=booking.tourist,
        booking=booking,
        event=booking.event,
        package=booking.package,
        template=template,
        status="draft"
    )

    # Add each guest as a BillItem
    for guest in booking.guests.all():
        BillItem.objects.create(
            bill=bill,
            item_type="guest",
            guest=guest,
            description=f"Charge for {guest.full_name}",
            base_amount=booking.package.base_price,
            discount_amount=Decimal(0),
            final_amount=booking.package.base_price
        )

    return bill

# =====================================================
# Add Fee to a Bill
# =====================================================
def add_fee(bill: Bill, fee_type: FeeType, amount: Decimal = None, description: str = None):
    if amount is None:
        amount = fee_type.default_amount

    if description is None:
        description = fee_type.name

    item = BillItem.objects.create(
        bill=bill,
        item_type="fee",
        fee_type=fee_type,
        description=description,
        base_amount=amount,
        discount_amount=Decimal(0),
        final_amount=amount
    )
    return item

# =====================================================
# Recalculate Bill Totals
# =====================================================
def recalculate_bill_totals(bill: Bill):
    total = Decimal(0)
    for item in bill.items.all():
        item.final_amount = item.base_amount - item.discount_amount
        item.save()
        total += item.final_amount
    bill.booking.total_amount = total
    bill.booking.save()
    return total

# =====================================================
# Generate PDF from Template
# =====================================================
def generate_bill_pdf(bill: Bill):
    if not bill.template:
        raise ValueError("Bill has no template assigned.")

    context = {
        "bill": bill,
        "items": bill.items.all(),
        "date": timezone.now(),
    }

    html_string = render_to_string("billing/bill_template.html", context)
    html = HTML(string=html_string)
    pdf_file = html.write_pdf()

    bill.bill_document.save(f"bill_{bill.id}.pdf", ContentFile(pdf_file))
    bill.save()
    return bill.bill_document

# =====================================================
# Verify Payment
# =====================================================
def verify_payment(bill: Bill, staff_user):
    bill.status = "verified"
    bill.save()
    AuditLog.objects.create(
        user=staff_user,
        content_type=bill._meta.get_field('id').model._meta.model_name,
        object_id=bill.id,
        action="Payment Verified",
        message=f"Bill {bill.id} verified by {staff_user.username}"
    )
    return bill

# =====================================================
# Reject Payment
# =====================================================
def reject_payment(bill: Bill, staff_user, reason=""):
    bill.status = "rejected"
    bill.save()
    AuditLog.objects.create(
        user=staff_user,
        content_type=bill._meta.get_field('id').model._meta.model_name,
        object_id=bill.id,
        action="Payment Rejected",
        message=f"Bill {bill.id} rejected by {staff_user.username}. Reason: {reason}"
    )
    return bill
