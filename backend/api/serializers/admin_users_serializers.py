from rest_framework import serializers

from ..models import User, Qualification
from django.contrib.auth.password_validation import validate_password


class AdminNewQualificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Qualification
        fields = ["id", "name", "description"]


class AdminNewUserSerializer(serializers.ModelSerializer):

    qualifications = AdminNewQualificationSerializer(many=True, read_only=True)
    qualification_ids = serializers.PrimaryKeyRelatedField(
        queryset=Qualification.objects.all(),
        source="qualifications",
        many=True,
        write_only=True,
        required=False,
    )

    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",          # new
            "first_name",        # new (the form sends these)
            "last_name",         # new
            "darkMode",          # new
            "themeColor",        # new
            "phone_number",
            "role",
            "status",
            "is_email_verified",
            "is_active",
            "is_archived",
            "profile_picture",
            "qualifications",
            "qualification_ids",
            "date_joined",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "date_joined", "created_at", "updated_at"]

    def validate_password(self, value):
        if value:
            validate_password(value)  # runs Django's AUTH_PASSWORD_VALIDATORS
        return value

    # validate() stays the same

    def create(self, validated_data):
        qualifications = validated_data.pop("qualifications", [])
        password = validated_data.pop("password", "")
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        if qualifications:
            user.qualifications.set(qualifications)
        return user

    def update(self, instance, validated_data):
        qualifications = validated_data.pop("qualifications", None)
        password = validated_data.pop("password", "")
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:  # blank means "keep current password"
            instance.set_password(password)
        instance.save()
        if qualifications is not None:
            instance.qualifications.set(qualifications)
        return instance