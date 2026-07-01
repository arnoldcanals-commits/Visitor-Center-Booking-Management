from rest_framework import generics, permissions, status
from rest_framework.response import Response
import re
from django.contrib.auth import login
from ..serializers import RegisterSerializer, LoginSerializer, UserSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from ..serializers import LoginSerializer, UserSerializer
from rest_framework.exceptions import ValidationError


# ✅ API Signup View
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get("email", "").lower().strip()

        # 🚫 block sec_bot_########@security-test.com
        if re.match(r"^sec_bot_\d+@security-test\.com$", email):
            raise ValidationError("Invalid email address.")

        return super().post(request, *args, **kwargs)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class LoginView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)

        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)
