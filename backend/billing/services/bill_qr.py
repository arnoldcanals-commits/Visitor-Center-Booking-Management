import qrcode
from io import BytesIO
from django.core.files.base import ContentFile

def generate_gcash_qr(bill):
    payload = f"GCASH|{bill.reference_no}|{bill.total_amount}"

    qr = qrcode.make(payload)
    buffer = BytesIO()
    qr.save(buffer, format="PNG")

    return ContentFile(buffer.getvalue(), name=f"gcash_{bill.reference_no}.png")
