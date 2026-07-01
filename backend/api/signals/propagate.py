from django.db.models.signals import post_save
from django.dispatch import receiver
from ..models import TourEvent, Booking, TourEventItinerary

# ---------------------------------------------------------
# When a TourEvent is saved
# ---------------------------------------------------------
@receiver(post_save, sender=TourEvent)
def propagate_event_to_bookings(sender, instance, **kwargs):
    print(f"[DEBUG] TourEvent signal fired for event {instance.id}")
    for booking in instance.bookings.all():
        updated = False

        if booking.assigned_guide != instance.assigned_guide:
            print(f"[DEBUG] Updating booking {booking.id} guide: {booking.assigned_guide} → {instance.assigned_guide}")
            booking.assigned_guide = instance.assigned_guide
            updated = True

        if booking.itinerary != instance.active_itinerary:
            print(f"[DEBUG] Updating booking {booking.id} itinerary: {booking.itinerary} → {instance.active_itinerary}")
            booking.itinerary = instance.active_itinerary
            updated = True

        if updated:
            booking.save(update_fields=['assigned_guide', 'itinerary'])
            print(f"[DEBUG] Booking {booking.id} updated")


# ---------------------------------------------------------
# When a new TourEventItinerary is saved
# ---------------------------------------------------------
@receiver(post_save, sender=TourEventItinerary)
def propagate_itinerary_to_event_bookings(sender, instance, **kwargs):
    print(f"[DEBUG] TourEventItinerary signal fired for itinerary {instance.id}")
    event = instance.event
    if event.active_itinerary == instance:
        for booking in event.bookings.all():
            if booking.itinerary != instance:
                print(f"[DEBUG] Updating booking {booking.id} itinerary to new active itinerary {instance.id}")
                booking.itinerary = instance
                booking.save(update_fields=['itinerary'])
                print(f"[DEBUG] Booking {booking.id} itinerary updated")
