from io import BytesIO
from decimal import Decimal
from xml.sax.saxutils import escape

from django.core.files.base import ContentFile
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image,
    LongTable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    TableStyle,
)
import logging

logger = logging.getLogger(__name__)


def _paragraph_text(value):
    return escape(str(value)).replace("\n", "<br/>")


def _format_money(value):
    return f"PHP {Decimal(str(value or 0)):,.2f}"


def generate_bill_pdf(bill):
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.6 * inch,
        leftMargin=0.6 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "BillTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#153c63"),
    )
    center_style = ParagraphStyle(
        "BillCenter",
        parent=styles["Normal"],
        alignment=TA_CENTER,
    )
    right_style = ParagraphStyle(
        "BillTotal",
        parent=styles["Heading2"],
        alignment=TA_RIGHT,
    )
    cell_style = ParagraphStyle(
        "BillCell",
        parent=styles["BodyText"],
        fontSize=9,
        leading=12,
    )

    story = [
        Paragraph("Sablayan Visitor Center", title_style),
        Paragraph("Poblacion, Sablayan, Occidental Mindoro", center_style),
        Spacer(1, 16),
        Paragraph("Official Bill", styles["Heading1"]),
        Paragraph(f"Bill #: {_paragraph_text(bill.reference_no)}", styles["Normal"]),
        Paragraph(f"Status: {_paragraph_text(bill.status.title())}", styles["Normal"]),
        Paragraph(
            f"Date Issued: {_paragraph_text(bill.issued_at or bill.created_at)}",
            styles["Normal"],
        ),
        Paragraph(f"Booking #: {bill.booking_id}", styles["Normal"]),
        Spacer(1, 12),
        Paragraph("Guests", styles["Heading2"]),
    ]

    guests = bill.booking.booking_guests.select_related("guest")
    guest_names = [guest.guest.full_name for guest in guests]
    story.extend(
        [
            Paragraph(
                _paragraph_text(", ".join(guest_names) if guest_names else "None"),
                styles["Normal"],
            ),
            Spacer(1, 12),
            Paragraph("Charges", styles["Heading2"]),
        ]
    )

    rows = [[
        Paragraph("Description", cell_style),
        Paragraph("Guest", cell_style),
        Paragraph("Amount", cell_style),
    ]]
    for item in bill.items.select_related("booking_guest__guest").order_by("id"):
        guest_name = (
            item.booking_guest.guest.full_name if item.booking_guest_id else "—"
        )
        rows.append(
            [
                Paragraph(_paragraph_text(item.description), cell_style),
                Paragraph(_paragraph_text(guest_name), cell_style),
                Paragraph(_format_money(item.final_amount), cell_style),
            ]
        )

    charges = LongTable(rows, colWidths=[3.4 * inch, 1.7 * inch, 1.2 * inch], repeatRows=1)
    charges.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eaf0f6")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#153c63")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (2, 1), (2, -1), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.extend(
        [
            charges,
            Spacer(1, 12),
            Paragraph(f"Total: {_format_money(bill.total_amount)}", right_style),
        ]
    )

    if bill.qr_code:
        with bill.qr_code.open("rb") as qr_file:
            qr_image = Image(BytesIO(qr_file.read()), width=1.5 * inch, height=1.5 * inch)
        story.extend(
            [
                Spacer(1, 12),
                Paragraph("Scan to pay via GCash", center_style),
                qr_image,
                Paragraph(
                    f"Reference No: {_paragraph_text(bill.reference_no)}",
                    center_style,
                ),
            ]
        )

    story.extend([Spacer(1, 18), Paragraph("Thank you for visiting!", center_style)])
    document.build(story)
    return buffer.getvalue()


def attach_bill_pdf(bill):
    pdf_bytes = generate_bill_pdf(bill)
    filename = f"bill_{bill.id}.pdf"
    bill.bill_document.save(filename, ContentFile(pdf_bytes), save=True)
    logger.info("Bill PDF saved successfully: %s", bill.bill_document.url)
    return bill.bill_document
