from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from api.models import Booking, BookingGuest
from billing.models import Bill


# ----------------------------
# Create Bill on Booking creation
# ----------------------------
@receiver(post_save, sender=Booking)
def create_bill_when_booking_completed(sender, instance: Booking, created, **kwargs):
    """
    Create a Bill when a Booking is created, if it has a package
    """
    if not created:
        return

    # Ensure booking has a package
    if not instance.package:
        return

    # Avoid duplicate bills
    if hasattr(instance, "bill"):
        return

    # Create bill with base package price
    Bill.objects.create(
        booking=instance,
        base_amount=instance.package.base_price,
        status="draft",
    )


# ----------------------------
# Recalculate Bill when BookingGuest changes
# ----------------------------
@receiver(post_save, sender=BookingGuest)
@receiver(post_delete, sender=BookingGuest)
def recalculate_bill_on_booking_guest_change(sender, instance, **kwargs):
    booking = instance.booking
    if hasattr(booking, "bill"):
        booking.bill.recalculate_total(commit=True)
