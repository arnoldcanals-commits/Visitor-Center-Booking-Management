from rest_framework import serializers
from ..models import Bill
from django.conf import settings

# Serializer for returning a Bill PDF link and status
class UserBillPdfSerializer(serializers.ModelSerializer):
    bill_pdf_url = serializers.SerializerMethodField()
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Bill
        fields = [
            "id",
            "reference_no",
            "status",
            "bill_pdf_url",
        ]
        read_only_fields = fields

    def get_bill_pdf_url(self, obj):
        request = self.context.get("request")
        if obj.bill_document:
            return request.build_absolute_uri(obj.bill_document.url) if request else obj.bill_document.url
        return None


# Serializer for uploading payment proof
class UserBillProofSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bill
        fields = [
            "transaction_image",
            "transaction_number",
        ]

    def validate(self, attrs):
        bill = self.instance
        if not bill:
            raise serializers.ValidationError("Bill instance is required for proof upload.")

        # Only allow proof upload for ISSUED bills
        if bill.status != "issued":
            raise serializers.ValidationError(
                "You can only submit payment proof for issued bills."
            )

        if not attrs.get("transaction_image"):
            raise serializers.ValidationError({
                "transaction_image": "Proof of transaction image is required."
            })

        if not attrs.get("transaction_number"):
            raise serializers.ValidationError({
                "transaction_number": "Transaction number is required."
            })

        return attrs

    def update(self, instance, validated_data):
        # Update the instance without changing status
        instance.transaction_image = validated_data.get("transaction_image", instance.transaction_image)
        instance.transaction_number = validated_data.get("transaction_number", instance.transaction_number)
        instance.save(update_fields=["transaction_image", "transaction_number"])
        return instance
