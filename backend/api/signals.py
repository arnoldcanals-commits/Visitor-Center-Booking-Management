from django.db.models.signals import pre_save, post_save
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


# Stash the pre-save value of requested_cancellation on the instance so the
# post_save handler below can tell whether it actually changed on this save.
@receiver(pre_save, sender=Booking)
def stash_previous_requested_cancellation(sender, instance, **kwargs):
    if instance.pk:
        instance._previous_requested_cancellation = (
            Booking.objects.filter(pk=instance.pk)
            .values_list("requested_cancellation", flat=True)
            .first()
        )
    else:
        instance._previous_requested_cancellation = None


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
            message=f"Your booking for {instance.package.name if instance.package else 'Tour'} has been changed to {instance.status}.",
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

    # 4. CANCELLATION REQUEST TOGGLED (Notify Tourist + Staff)
    previous_requested_cancellation = getattr(
        instance, "_previous_requested_cancellation", None
    )
    cancellation_flag_changed = (
        not created
        and previous_requested_cancellation is not None
        and previous_requested_cancellation != instance.requested_cancellation
    )

    if cancellation_flag_changed:
        if instance.requested_cancellation:
            Notification.objects.create(
                user=instance.tourist,
                notification_type="booking",
                title="Cancellation Requested",
                message=f"Booking #{instance.id} has been requested for cancellation.",
                related_booking=instance
            )
            notify_staff(
                title="Cancellation Requested",
                message=f"Booking #{instance.id} has been requested for cancellation.",
                booking=instance
            )
        else:
            Notification.objects.create(
                user=instance.tourist,
                notification_type="booking",
                title="Cancellation Rescinded",
                message=f"Booking #{instance.id} request for cancellation rescinded.",
                related_booking=instance
            )
            notify_staff(
                title="Cancellation Rescinded",
                message=f"Booking #{instance.id} request for cancellation rescinded.",
                booking=instance
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