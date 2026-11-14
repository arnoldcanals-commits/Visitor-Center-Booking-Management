from decimal import Decimal
from django.utils import timezone
from django.core.files.base import ContentFile
from ..audit import audit_actor
from ..models import Bill, BillItem, FeeType, Booking, Guest, BillTemplate

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
    from billing.services.bill_pdf import generate_bill_pdf as render_bill_pdf

    pdf_file = render_bill_pdf(bill)
    bill.bill_document.save(f"bill_{bill.id}.pdf", ContentFile(pdf_file), save=True)
    return bill.bill_document

# =====================================================
# Verify Payment
# =====================================================
def verify_payment(bill: Bill, staff_user):
    bill.status = "verified"
    with audit_actor(staff_user):
        bill.save()
    return bill

# =====================================================
# Reject Payment
# =====================================================
def reject_payment(bill: Bill, staff_user, reason=""):
    bill.status = "rejected"
    with audit_actor(staff_user):
        bill.save()
    return bill
