from rest_framework import serializers
from .models import Permit, PermitTemplate
from api.models import Guest  # adjust import path to match your app

class GuestMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guest
        fields = ["id", "full_name", "age", "gender", "local"]


class PermitSerializer(serializers.ModelSerializer):
    guests = GuestMiniSerializer(many=True, read_only=True)

    class Meta:
        model = Permit
        fields = [
            "id", "guests", "status", "generated_pdf",
            "fee_amount", "payment_reference", "paid_at",
            "signed_at", "signed_by", "created_at",
        ]
        read_only_fields = [
            "status", "generated_pdf", "paid_at", "signed_at", "created_at"
        ]


class CreatePermitSerializer(serializers.Serializer):
    guest_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1)

class PermitTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermitTemplate
        fields = ["id", "name", "file", "is_active", "created_at"]
        read_only_fields = ["created_at"]