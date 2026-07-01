from django.utils import timezone
from django.db.models import Count, Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from ..models import Booking, EventStationGuestCheck, TourEvent, Review


@api_view(["GET"])
@permission_classes([IsAdminUser])
def dashboard_summary(request):
    today = timezone.now().date()

    completed = Booking.objects.filter(status__in=["approved", "active", "completed"])

    today_bookings = completed.filter(booking_date__date=today)
    month_bookings = completed.filter(booking_date__month=today.month)

    guests_today = sum(b.booking_guests.count() for b in today_bookings)

    revenue_today = today_bookings.aggregate(
        Sum("bill__total_amount")
    )["bill__total_amount__sum"] or 0

    revenue_month = month_bookings.aggregate(
        Sum("bill__total_amount")
    )["bill__total_amount__sum"] or 0

    status_counts = Booking.objects.values("status").annotate(count=Count("id"))

    active_events = TourEvent.objects.filter(
        start_date__lte=today,
        end_date__gte=today
    ).count()

    qr_checks_today = EventStationGuestCheck.objects.filter(
        checked=True,
        checked_at__date=today
    ).count()

    pending_reviews = Review.objects.filter(rating__isnull=True).count()

    return Response({
        "guests_today": guests_today,
        "revenue_today": revenue_today,
        "revenue_month": revenue_month,
        "active_events": active_events,
        "qr_checks_today": qr_checks_today,
        "pending_reviews": pending_reviews,
        "status_counts": list(status_counts),
    })