from rest_framework import serializers
from ..models import FeeType


class FeeTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeType
        fields = [
            "id",
            "name",
            "description",
            "default_amount",
            "is_active",
        ]
        read_only_fields = ["id"]

    def validate_default_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Default amount cannot be negative.")
        return value
    
from rest_framework import serializers
from ..models import BillItem, FeeType, BookingGuest


class BillItemSerializer(serializers.ModelSerializer):
    fee_type = serializers.PrimaryKeyRelatedField(
        queryset=FeeType.objects.all(),
        required=False,
        allow_null=True
    )

    booking_guest = serializers.PrimaryKeyRelatedField(
        queryset=BookingGuest.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = BillItem
        fields = [
            "id",
            "bill",
            "item_type",
            "booking_guest",
            "fee_type",
            "description",
            "base_amount",
            "discount_amount",
            "final_amount",
            "created_at",
        ]
        read_only_fields = ["id", "final_amount", "created_at"]

    def validate(self, data):
        item_type = data.get("item_type")

        if item_type == "fee" and not data.get("fee_type"):
            raise serializers.ValidationError({
                "fee_type": "Fee type is required for fee items."
            })

        if item_type == "guest" and not data.get("booking_guest"):
            raise serializers.ValidationError({
                "booking_guest": "Booking guest is required for guest charges."
            })

        return data

    def create(self, validated_data):
        return BillItem.objects.create(**validated_data)

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance