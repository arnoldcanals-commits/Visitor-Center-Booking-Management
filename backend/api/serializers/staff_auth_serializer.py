# api/serializers/staff_auth.py
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

STAFF_ROLES = ["tour_guide", "staff", "station_staff", "admin"]


class StaffTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Issues JWT tokens ONLY for staff roles
    and embeds role/status into the token.
    """

    def validate(self, attrs):
        data = super().validate(attrs)

        user = self.user

        if user.role not in STAFF_ROLES:
            raise serializers.ValidationError("Unauthorized staff account.")

        # Extra response payload
        data["role"] = user.role
        data["status"] = user.status
        data["username"] = user.username
        data["email"] = user.email

        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Embed claims (used by AuthContext)
        token["role"] = user.role
        token["status"] = user.status
        token["username"] = user.username
        token["email"] = user.email

        return token
