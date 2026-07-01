from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from api.models import Booking, BookingGuest
from billing.models import Bill, BillItem


# ----------------------------
# Create Bill on Booking creation
# ----------------------------
@receiver(post_save, sender=Booking)
def create_bill_when_booking_completed(sender, instance: Booking, created, **kwargs):
    """
    Create a Bill when a Booking is created, including package digest info,
    and automatically create BillItems for each BookingGuest.
    """
    if not created:
        return

    # Ensure booking has a package
    if not instance.package:
        return

    # Avoid duplicate bills
    if hasattr(instance, "bill"):
        return

    # Create the Bill, including the digest from the package
    bill = Bill.objects.create(
        booking=instance,
        base_amount=instance.package.base_price,
        total_amount=instance.package.base_price,  # initial total, will be recalculated
        status="draft",
    )

    # Store the package digest in the bill (optional extra field)
    if hasattr(instance.package, "digest"):
        # Use a special BillItem to store digest for receipt
        BillItem.objects.create(
            bill=bill,
            item_type="fee",
            description=f"Package Info: {instance.package.digest}",
            base_amount=0,
            discount_amount=0,
            final_amount=0,
        )

    # Create guest-specific BillItems
    for bg in instance.booking_guests.all():
        BillItem.objects.create(
            bill=bill,
            item_type="guest",
            booking_guest=bg,
            base_amount=bill.base_amount,
        )

    # Recalculate total (includes guest items and fees)
    bill.recalculate_total(commit=True)


# ----------------------------
# Recalculate Bill when BookingGuest changes
# ----------------------------
@receiver(post_save, sender=BookingGuest)
@receiver(post_delete, sender=BookingGuest)
def recalculate_bill_on_booking_guest_change(sender, instance, **kwargs):
    booking = instance.booking
    if hasattr(booking, "bill"):
        # Update or create guest-specific BillItem if new BookingGuest added
        if sender == BookingGuest and kwargs.get("created", False):
            BillItem.objects.create(
                bill=booking.bill,
                item_type="guest",
                booking_guest=instance,
                base_amount=booking.bill.base_amount,
            )
        # Recalculate total
        booking.bill.recalculate_total(commit=True)

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Booking, Notification, User, Review, Permit

# Helper to notify all staff/admins
def notify_staff(title, message, booking=None):
    staff_members = User.objects.filter(role__in=['admin', 'staff'])
    for staff in staff_members:
        Notification.objects.create(
            user=staff,
            notification_type="booking",
            title=title,
            message=message,
            related_booking=booking
        )

@receiver(post_save, sender=Booking)
def booking_notifications(sender, instance, created, **kwargs):
    # 1. NEW BOOKING (Notify Admin/Staff)
    if created:
        notify_staff(
            title="New Booking Request",
            message=f"New booking #{instance.id} from {instance.tourist.email} is pending approval.",
            booking=instance
        )

    # 2. STATUS CHANGES (Notify Tourist)
    # We check if the status was updated (this logic works best if you track previous_status)
    else:
        # Notify User of Approval/Rejection/Cancellation
        Notification.objects.create(
            user=instance.tourist,
            notification_type="booking",
            title=f"Booking {instance.status.capitalize()}",
            message=f"Your booking for {instance.package.name if instance.package else 'Tour'} has been changed to{instance.status}.",
            related_booking=instance
        )

        # 3. GUIDE ASSIGNMENT (Notify both Guide and Tourist)
        # Note: Your model updates assigned_guide in save(). 
        # If a guide is present and the status just became approved:
        if instance.status == "approved" and instance.assigned_guide:
            # Notify the Guide
            Notification.objects.create(
                user=instance.assigned_guide,
                notification_type="system",
                title="New Assignment",
                message=f"You have been assigned to Booking #{instance.id} starting {instance.check_in}.",
                related_booking=instance
            )
            # Notify the Tourist
            Notification.objects.create(
                user=instance.tourist,
                notification_type="system",
                title="Guide Assigned",
                message=f"{instance.assigned_guide.username} has been assigned as your guide!",
                related_booking=instance
            )

@receiver(post_save, sender=Permit)
def permit_notifications(sender, instance, created, **kwargs):
    # 4. PERMIT ISSUED (Notify Tourist)
    if created:
        Notification.objects.create(
            user=instance.booking.tourist,
            notification_type="permit",
            title="Travel Permit Issued",
            message=f"Your permit ({instance.permit_number}) is ready for download.",
            related_booking=instance.booking
        )

@receiver(post_save, sender=Review)
def review_notifications(sender, instance, created, **kwargs):
    # 5. NEW REVIEW (Notify Guide if they were reviewed)
    if created and instance.target_type == "guide" and instance.tour_guide:
        Notification.objects.create(
            user=instance.tour_guide,
            notification_type="review",
            title="New Review Received",
            message=f"A tourist rated you {instance.rating}/5 stars.",
            related_booking=instance.booking
        )