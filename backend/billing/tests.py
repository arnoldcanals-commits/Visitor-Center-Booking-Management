from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from api.models import Activity, Booking, BookingGuest, Guest, TourPackage
from billing.models import Bill, BillItem
from billing.serializers.admin import AdminBillSerializer
from billing.services.bill_workflow import sync_booking_bill_items
from billing.services.bill_pdf import generate_bill_pdf


class BookingActivityBillItemTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="billing-test@example.com",
            password="test-password",
            username="billing-test",
        )
        self.package = TourPackage.objects.create(
            name="Island Tour",
            digest="A guided tour",
            description="A guided island tour",
            base_price="100.00",
        )
        self.booking = Booking.objects.create(
            tourist=self.user,
            package=self.package,
        )
        self.guests = [
            BookingGuest.objects.create(
                booking=self.booking,
                guest=Guest.objects.create(full_name=name, age=25, gender="other"),
            )
            for name in ("Guest One", "Guest Two")
        ]
        self.activities = [
            Activity.objects.create(
                package=self.package,
                name=name,
                extra_price=price,
            )
            for name, price in (("Kayaking", "15.00"), ("Snorkeling", "20.00"))
        ]
        self.booking.selected_activities.set(self.activities)
        self.bill = self.booking.bill

    def test_selected_activities_create_idempotent_items_for_each_guest(self):
        sync_booking_bill_items(self.bill)
        sync_booking_bill_items(self.bill)

        items = BillItem.objects.filter(bill=self.bill, item_type="activity")
        self.assertEqual(items.count(), 4)
        self.assertEqual(
            set(items.values_list("booking_guest_id", flat=True)),
            {guest.id for guest in self.guests},
        )
        self.assertEqual(
            set(items.values_list("description", flat=True)),
            {"Kayaking", "Snorkeling"},
        )
        self.assertEqual(
            sum(item.final_amount for item in items),
            70,
        )
        package_items = BillItem.objects.filter(bill=self.bill, item_type="guest")
        self.assertEqual(package_items.count(), 2)
        self.assertEqual(
            set(package_items.values_list("final_amount", flat=True)),
            {Decimal("100.00")},
        )
        self.bill.refresh_from_db()
        self.assertEqual(self.bill.total_amount, 270)

    def test_bill_exposes_booking_guest_ids_for_item_assignment(self):
        data = AdminBillSerializer(self.bill).data

        self.assertEqual(
            data["booking_guests"],
            [
                {"id": guest.id, "full_name": guest.guest.full_name}
                for guest in self.guests
            ],
        )

    def test_issuing_bill_generates_activity_items_and_a_pdf(self):
        with (
            patch("billing.services.bill_workflow.generate_gcash_qr", return_value=None),
            patch("billing.services.bill_workflow.attach_bill_pdf") as attach_pdf,
        ):
            self.bill.issue()

            self.bill.refresh_from_db()
            self.assertEqual(self.bill.status, "issued")
            self.assertEqual(
                self.bill.items.filter(item_type="activity").count(),
                4,
            )
            self.assertEqual(
                self.bill.items.filter(item_type="guest").count(),
                2,
            )
            self.assertEqual(self.bill.total_amount, 270)
            attach_pdf.assert_called_once_with(self.bill)

    def test_bill_pdf_is_generated_without_weasyprint(self):
        sync_booking_bill_items(self.bill)

        self.assertTrue(generate_bill_pdf(self.bill).startswith(b"%PDF-"))
