from django.contrib.auth.tokens import PasswordResetTokenGenerator

email_verification_token = PasswordResetTokenGenerator()
password_reset_token = PasswordResetTokenGenerator()
