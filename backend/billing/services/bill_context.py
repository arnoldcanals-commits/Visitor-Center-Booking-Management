def build_bill_context(bill):
    return {
        "bill_number": bill.id,
        "issued_at": bill.issued_at,
        "status": bill.status,

        "booking_id": bill.booking.id,
        "package": bill.booking.package.name if bill.booking.package else None,
        "package_digest": bill.booking.package.digest if bill.booking.package else None,

        # Extract actual Guest objects from BookingGuest
        "guests": [bg.guest for bg in bill.booking.booking_guests.all()],

        "items": bill.items.all(),
        "base_amount": bill.base_amount,
        "total_amount": bill.total_amount,

        "payment": {
            "qr_code": bill.qr_code,
            "transaction_number": bill.transaction_number,
        }
    }
