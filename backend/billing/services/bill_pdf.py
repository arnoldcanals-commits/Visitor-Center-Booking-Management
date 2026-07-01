from django.template.loader import render_to_string
from django.core.files.base import ContentFile
from weasyprint import HTML
from django.conf import settings

from .bill_context import build_bill_context
import logging

logger = logging.getLogger(__name__)

def generate_bill_pdf(bill):
    """
    Generate a PDF for a bill and return it as bytes.
    """
    context = build_bill_context(bill)
    html = render_to_string("billing/bill_default.html", context)
    pdf_bytes = HTML(
        string=html,
        base_url=settings.BASE_DIR
    ).write_pdf()
    return pdf_bytes


def attach_bill_pdf(bill):
    try:
        pdf_bytes = generate_bill_pdf(bill)
        filename = f"bill_{bill.id}.pdf"
        bill.bill_document.save(filename, ContentFile(pdf_bytes), save=True)
        logger.info("Bill PDF saved successfully: %s", bill.bill_document.url)
    except Exception as e:
        logger.error("Failed to generate bill PDF: %s", e)
