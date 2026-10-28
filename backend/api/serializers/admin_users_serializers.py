from rest_framework import serializers

from ..models import User, Qualification


class AdminNewQualificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Qualification
        fields = ["id", "name", "description"]


class AdminNewUserSerializer(serializers.ModelSerializer):
    """
    Admin-facing user serializer. Fully standalone -- not tied to the
    generic all-data / site_admin CRUD system.
    """

    qualifications = AdminNewQualificationSerializer(many=True, read_only=True)
    qualification_ids = serializers.PrimaryKeyRelatedField(
        queryset=Qualification.objects.all(),
        source="qualifications",
        many=True,
        write_only=True,
        required=False,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
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

    def validate(self, attrs):
        # Prevent the "admin" role from being reassigned via this endpoint,
        # mirroring the locked-role behavior in the admin UI.
        instance = getattr(self, "instance", None)
        if instance and instance.role == "admin" and attrs.get("role", "admin") != "admin":
            raise serializers.ValidationError({"role": "Admin role cannot be changed."})
        return attrs

    def create(self, validated_data):
        qualifications = validated_data.pop("qualifications", [])
        user = User(**validated_data)
        # No password is collected from the admin "add user" form, so the
        # account starts with an unusable password until the user is
        # invited / resets it via whatever flow you use for that.
        user.set_unusable_password()
        user.save()
        if qualifications:
            user.qualifications.set(qualifications)
        return user

    def update(self, instance, validated_data):
        qualifications = validated_data.pop("qualifications", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if qualifications is not None:
            instance.qualifications.set(qualifications)
        return instance