from django.core.mail import send_mail
from django.conf import settings
from .tokens import email_verification_token, password_reset_token

def send_verification_email(user):
    token = email_verification_token.make_token(user)
    link = f"{settings.FRONTEND_URL}/verify-email?uid={user.id}&token={token}"

    send_mail(
        subject="Verify your email",
        message=f"Click to verify your account:\n\n{link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )

def send_password_reset_email(user):
    token = password_reset_token.make_token(user)
    link = f"{settings.FRONTEND_URL}/reset-password?uid={user.id}&token={token}"

    send_mail(
        subject="Reset your password",
        message=f"Reset your password here:\n\n{link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
