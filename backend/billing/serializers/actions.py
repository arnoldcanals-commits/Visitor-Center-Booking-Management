from rest_framework import serializers
from billing.models import Bill


class BillActionSerializer(serializers.Serializer):
    """Base serializer for bill actions"""
    bill_id = serializers.IntegerField(read_only=True)


class BillMarkPaidSerializer(serializers.Serializer):
    transaction_number = serializers.CharField(required=False, allow_blank=True)
    transaction_image = serializers.ImageField(required=False)
