# api/views/staff_auth_views.py
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from api.serializers.staff_auth_serializer import StaffTokenObtainPairSerializer


class StaffTokenObtainPairView(TokenObtainPairView):
    serializer_class = StaffTokenObtainPairSerializer
    permission_classes = [AllowAny]


class StaffTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]


class StaffMeView(APIView):
    """
    Returns logged-in staff profile
    Used by dashboards & guards
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "status": user.status,
        })
