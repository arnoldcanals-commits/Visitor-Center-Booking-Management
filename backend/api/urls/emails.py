from django.urls import path
from ..views import (
    VerifyEmailView,
    ForgotPasswordView,
    ResetPasswordView,
    
)

urlpatterns = [
    path("verify-email/", VerifyEmailView.as_view()),
    path("forgot-password/", ForgotPasswordView.as_view()),
    path("reset-password/", ResetPasswordView.as_view()),
]
