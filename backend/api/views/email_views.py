from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from ..auth.tokens import email_verification_token, password_reset_token
from ..auth.utils import send_verification_email, send_password_reset_email

User = get_user_model()


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")

        if not uid or not token:
            return Response(
                {"error": "UID and token are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(id=uid)
        except User.DoesNotExist:
            return Response(
                {"error": "Invalid user"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.is_email_verified:
            return Response(
                {"message": "Email already verified"},
                status=status.HTTP_200_OK
            )

        if email_verification_token.check_token(user, token):
            user.is_email_verified = True
            user.save(update_fields=["is_email_verified"])
            return Response(
                {"message": "Email verified successfully"},
                status=status.HTTP_200_OK
            )

        return Response(
            {"error": "Invalid or expired token"},
            status=status.HTTP_400_BAD_REQUEST
        )


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")

        if not email:
            return Response(
                {"error": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = User.objects.filter(email=email).first()
        if user:
            send_password_reset_email(user)

        # Always return the same message for security
        return Response(
            {"message": "If the email exists, a reset link was sent"},
            status=status.HTTP_200_OK
        )


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")
        password = request.data.get("password")

        if not uid or not token or not password:
            return Response(
                {"error": "UID, token, and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(id=uid)
        except User.DoesNotExist:
            return Response(
                {"error": "Invalid user"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not password_reset_token.check_token(user, token):
            return Response(
                {"error": "Invalid or expired token"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_password(password, user)
        except ValidationError as e:
            return Response(
                {"errors": e.messages},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(password)
        user.save(update_fields=["password"])

        return Response(
            {"message": "Password reset successful"},
            status=status.HTTP_200_OK
        )
