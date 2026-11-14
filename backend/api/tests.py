from datetime import timedelta

from django.contrib.contenttypes.models import ContentType
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from api.audit import audit_actor
from api.models import (
    Activity,
    AuditLog,
    Booking,
    TourEvent,
    TourPackage,
    TourPackageImage,
    User,
)
from api.tasks import reject_pending_bookings_after_start
from billing.models import Bill


class BookingAuditTests(TestCase):
    def setUp(self):
        self.actor = User.objects.create_user(
            email="auditor@example.com",
            username="auditor",
            password="test-password",
        )
        self.booking = Booking.objects.create(
            tourist=self.actor,
            check_in=timezone.now() + timedelta(days=1),
        )

    def audit_entries(self):
        content_type = ContentType.objects.get_for_model(Booking)
        return AuditLog.objects.filter(
            content_type=content_type,
            object_id=str(self.booking.pk),
        )

    def test_status_change_records_actor_and_before_after_values(self):
        with audit_actor(self.actor):
            self.booking.status = "approved"
            self.booking.save(update_fields=["status"])

        entry = self.audit_entries().get(action="status_changed")
        self.assertEqual(entry.user, self.actor)
        self.assertEqual(entry.changes["actor"], self.actor.username)
        self.assertEqual(
            entry.changes["status"],
            {"from": "pending", "to": "approved"},
        )

    def test_jwt_authenticated_api_request_records_the_real_actor(self):
        package = TourPackage.objects.create(
            name="Audit test package",
            digest="Short description",
            description="Package description",
            base_price=100,
        )
        client = APIClient()
        client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {AccessToken.for_user(self.actor)}"
        )

        response = client.post(
            reverse("booking-create"),
            {"package": package.pk, "guests": []},
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        booking_id = response.data["id"]
        entry = AuditLog.objects.get(
            content_type=ContentType.objects.get_for_model(Booking),
            object_id=str(booking_id),
            action="created",
        )
        self.assertEqual(entry.user, self.actor)
        self.assertEqual(entry.changes["actor"], self.actor.username)

    def test_many_to_many_changes_record_actor_and_relation(self):
        package = TourPackage.objects.create(
            name="Activity package",
            digest="Short description",
            description="Package description",
            base_price=100,
        )
        activity = Activity.objects.create(
            package=package,
            name="Guided walk",
        )
        booking = Booking.objects.create(
            tourist=self.actor,
            package=package,
            check_in=timezone.now() + timedelta(days=1),
        )

        with audit_actor(self.actor):
            booking.selected_activities.add(activity)

        entry = AuditLog.objects.get(
            content_type=ContentType.objects.get_for_model(Booking),
            object_id=str(booking.pk),
            action="relation_added",
        )
        self.assertEqual(entry.user, self.actor)
        self.assertEqual(
            entry.changes["selected_activities"],
            {"operation": "added", "ids": [activity.pk]},
        )
        self.assertEqual(entry.changes["actor"], self.actor.username)

    def test_event_guide_assignment_propagation_is_audited(self):
        package = TourPackage.objects.create(
            name="Event package",
            digest="Short description",
            description="Package description",
            base_price=100,
        )
        event = TourEvent.objects.create(package=package)
        booking = Booking.objects.create(
            tourist=self.actor,
            package=package,
            event=event,
            check_in=timezone.now() + timedelta(days=1),
        )
        guide = User.objects.create_user(
            email="guide@example.com",
            username="guide",
            password="test-password",
            role="tour_guide",
        )

        with audit_actor(self.actor):
            event.assigned_guide = guide
            event.save(update_fields=["assigned_guide"])

        entry = AuditLog.objects.get(
            content_type=ContentType.objects.get_for_model(Booking),
            object_id=str(booking.pk),
            action="updated",
        )
        self.assertEqual(entry.user, self.actor)
        self.assertEqual(
            entry.changes["assigned_guide"],
            {"from": None, "to": guide.pk},
        )

    def test_changing_main_package_image_audits_both_images(self):
        package = TourPackage.objects.create(
            name="Image package",
            digest="Short description",
            description="Package description",
            base_price=100,
        )
        old_main = TourPackageImage.objects.create(package=package, is_main=True)
        new_main = TourPackageImage.objects.create(package=package, is_main=False)

        with audit_actor(self.actor):
            new_main.is_main = True
            new_main.save(update_fields=["is_main"])

        old_main.refresh_from_db()
        self.assertFalse(old_main.is_main)
        old_entry = AuditLog.objects.get(
            content_type=ContentType.objects.get_for_model(TourPackageImage),
            object_id=str(old_main.pk),
            action="updated",
        )
        new_entry = AuditLog.objects.get(
            content_type=ContentType.objects.get_for_model(TourPackageImage),
            object_id=str(new_main.pk),
            action="updated",
        )
        self.assertEqual(old_entry.changes["is_main"], {"from": True, "to": False})
        self.assertEqual(new_entry.changes["is_main"], {"from": False, "to": True})
        self.assertEqual(old_entry.user, self.actor)
        self.assertEqual(new_entry.user, self.actor)

    def test_unchanged_save_does_not_create_a_duplicate_entry(self):
        before = self.audit_entries().count()
        with audit_actor(self.actor):
            self.booking.save()
        self.assertEqual(self.audit_entries().count(), before)

    def test_soft_delete_is_recorded_as_deleted(self):
        self.booking.delete()
        entry = self.audit_entries().get(action="deleted")
        self.assertFalse(entry.changes["is_active"]["to"])

    def test_bill_issue_is_audited_with_the_actor(self):
        bill = Bill.objects.create(booking=self.booking)
        with audit_actor(self.actor):
            bill.status = "issued"
            bill.save()

        entry = AuditLog.objects.get(
            content_type=ContentType.objects.get_for_model(Bill),
            object_id=str(bill.pk),
            action="issued",
        )
        self.assertEqual(entry.user, self.actor)
        self.assertEqual(entry.changes["actor"], self.actor.username)
        self.assertEqual(
            entry.changes["status"],
            {"from": "draft", "to": "issued"},
        )

    def test_bill_recalculation_is_audited(self):
        bill = Bill.objects.create(booking=self.booking, total_amount=50)

        with audit_actor(self.actor):
            bill.recalculate_total()

        entry = AuditLog.objects.get(
            content_type=ContentType.objects.get_for_model(Bill),
            object_id=str(bill.pk),
            action="updated",
        )
        self.assertEqual(entry.user, self.actor)
        self.assertEqual(
            entry.changes["total_amount"],
            {"from": "50.00", "to": "0.00"},
        )


class BookingExpiryTaskTests(TestCase):
    def setUp(self):
        self.tourist = User.objects.create_user(
            email="tourist@example.com",
            username="tourist",
            password="test-password",
        )

    def test_rejects_pending_bookings_past_start_and_is_idempotent(self):
        booking = Booking.objects.create(
            tourist=self.tourist,
            check_in=timezone.now() + timedelta(days=1),
        )
        Booking.objects.filter(pk=booking.pk).update(
            check_in=timezone.now() - timedelta(minutes=1)
        )

        self.assertEqual(reject_pending_bookings_after_start(), 1)
        booking.refresh_from_db()
        self.assertEqual(booking.status, "rejected")
        self.assertEqual(reject_pending_bookings_after_start(), 0)

        entry = AuditLog.objects.get(
            content_type=ContentType.objects.get_for_model(Booking),
            object_id=str(booking.pk),
            action="status_changed",
        )
        self.assertEqual(entry.changes["status"]["to"], "rejected")

    def test_keeps_future_pending_bookings(self):
        booking = Booking.objects.create(
            tourist=self.tourist,
            check_in=timezone.now() + timedelta(days=1),
        )

        self.assertEqual(reject_pending_bookings_after_start(), 0)
        booking.refresh_from_db()
        self.assertEqual(booking.status, "pending")
