import qrcode
from io import BytesIO
from django.core.files.base import ContentFile

def generate_gcash_qr(bill):
    """
    Generates a simple GCash QR code for a Bill.
    """

    payload = f"GCASH|{bill.reference_no}|{bill.total_amount}"

    qr = qrcode.make(payload)
    buffer = BytesIO()
    qr.save(buffer, format="PNG")

    bill.qr_code.save(
        f"gcash_{bill.reference_no}.png",
        ContentFile(buffer.getvalue()),
        save=True
    )

    return bill.qr_code
