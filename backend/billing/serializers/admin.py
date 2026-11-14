# billing/serializers/admin.py
from rest_framework import serializers
from billing.models import (
    BillTemplate,
    FeeType,
    Bill,
    BillItem,
)
from api.models import BookingGuest


# =====================================================
# BILL TEMPLATE
# =====================================================
class AdminBillTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillTemplate
        fields = [
            "id",
            "name",
            "template_file",
            "is_active",
            "created_at",
        ]


# =====================================================
# FEE TYPE
# =====================================================
class AdminFeeTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeType
        fields = [
            "id",
            "name",
            "description",
            "default_amount",
            "is_active",
        ]


# =====================================================
# BILL ITEM
# =====================================================
class AdminBillItemSerializer(serializers.ModelSerializer):
    guest_name = serializers.CharField(
        source="booking_guest.guest.full_name",
        read_only=True,
        allow_null=True,
    )
    booking_guest = serializers.PrimaryKeyRelatedField(
        queryset=BookingGuest.objects.all(),
        required=False,
        allow_null=True,
    )
    fee_type_name = serializers.CharField(
        source="fee_type.name",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = BillItem
        fields = [
            "id",
            "bill",
            "item_type",
          
            "booking_guest",
            "guest_name",
            "fee_type",
            "fee_type_name",
            "description",
            "base_amount",
            "discount_amount",
            "final_amount",
            "created_at",
        ]
        read_only_fields = ["final_amount", "created_at"]

# =====================================================
# BILL
# =====================================================
# billing/serializers/admin.py
from rest_framework import serializers
from billing.models import Bill, BillItem, BillTemplate, FeeType


# =====================================================
# BILL ITEM
# =====================================================
class AdminBillItemSerializer(serializers.ModelSerializer):
    guest_name = serializers.CharField(
        source="booking_guest.guest.full_name",
        read_only=True,
        allow_null=True,
    )
    booking_guest = serializers.PrimaryKeyRelatedField(
        queryset=BookingGuest.objects.all(),
        required=False,
        allow_null=True,
    )
    fee_type_name = serializers.CharField(
        source="fee_type.name",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = BillItem
        fields = [
            "id",
            "bill",
            "item_type",
            
            "booking_guest",
            "guest_name",
            "fee_type",
            "fee_type_name",
            "description",
            "base_amount",
            "discount_amount",
            "final_amount",
            "created_at",
        ]
        read_only_fields = ["final_amount", "created_at"]

    def validate(self, attrs):
        bill = attrs.get("bill", getattr(self.instance, "bill", None))
        booking_guest = attrs.get(
            "booking_guest", getattr(self.instance, "booking_guest", None)
        )
        if bill and booking_guest and booking_guest.booking_id != bill.booking_id:
            raise serializers.ValidationError(
                {"booking_guest": "Guest must belong to this bill's booking."}
            )
        return attrs


# =====================================================
# BILL
# =====================================================
class AdminBillSerializer(serializers.ModelSerializer):
    booking_id = serializers.IntegerField(source="booking.id", read_only=True)
    booking_guests = serializers.SerializerMethodField()
    tourist_name = serializers.CharField(
        source="booking.tourist.username",
        read_only=True
    )
    reference_no = serializers.CharField(read_only=True)

    items = AdminBillItemSerializer(many=True, read_only=True)

    bill_document = serializers.FileField(use_url=True)
    transaction_image = serializers.ImageField(use_url=True)
    qr_code = serializers.ImageField(use_url=True)

    def get_booking_guests(self, obj):
        return [
            {"id": booking_guest.id, "full_name": booking_guest.guest.full_name}
            for booking_guest in obj.booking.booking_guests.all()
        ]

    class Meta:
        model = Bill
        fields = [
            "id",
            "booking",
            "booking_id",
            "booking_guests",
            "tourist_name",
            "reference_no",

            "template",
            "base_amount",
            "total_amount",

            "status",
            "issued_at",
            "paid_at",
            "verified_at",
            "rejected_at",

            "transaction_number",
            "transaction_image",
            "bill_document",
            "qr_code",

            "payment_method",
            "payment_status",

            "items",
            "created_at",
            "updated_at",
        ]

        # 🔒 HARD LOCK WORKFLOW FIELDS
        read_only_fields = [
            "reference_no",
            "base_amount",
            "total_amount",

            "status",
            "issued_at",
            "paid_at",
            "verified_at",
            "rejected_at",

            "created_at",
            "updated_at",
        ]
