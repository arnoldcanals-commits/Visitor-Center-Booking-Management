from celery import shared_task
from django.db import transaction
from django.utils import timezone

from .models import Booking


@shared_task
def reject_pending_bookings_after_start():
    now = timezone.now()
    overdue_bookings = Booking.objects.filter(
        status="pending",
        check_in__lte=now,
    ).order_by("check_in")

    rejected_count = 0
    with transaction.atomic():
        for booking in overdue_bookings.select_for_update():
            booking.status = "rejected"
            booking.save(update_fields=["status"])
            rejected_count += 1

    return rejected_count
