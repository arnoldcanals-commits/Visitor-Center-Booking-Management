# views/guest.py
from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied

from api.models import Guest
from api.serializers import (
    GuestSerializer,
    GuestDetailSerializer,
)


# =====================================================
# Permissions
# =====================================================
class IsTourist(permissions.BasePermission):
    """
    Allows access only to authenticated tourists.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "tourist"
        )


# =====================================================
# Guest ViewSet (Tourist Guest List)
# =====================================================
class GuestViewSet(viewsets.ModelViewSet):
    """
    Allows tourists to:
    - List their saved guests
    - Create new guests
    - Update their guests
    - Delete their guests
    - View guest travel history (detail view)
    """

    permission_classes = [IsTourist]

    def get_queryset(self):
        """
        Tourists only see their own guests.
        """
        user = self.request.user

        if not user.is_authenticated:
            return Guest.objects.none()

        return Guest.objects.filter(owner=user).order_by("-created_at")

    def get_serializer_class(self):
        """
        Use detail serializer (with history) for retrieve,
        base serializer for list/create/update.
        """
        if self.action == "retrieve":
            return GuestDetailSerializer
        return GuestSerializer

    def perform_create(self, serializer):
        """
        Ownership is enforced here as an extra safety layer.
        """
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        """
        Prevent updating guests not owned by the user.
        """
        guest = self.get_object()

        if guest.owner != self.request.user:
            raise PermissionDenied("You do not own this guest.")

        serializer.save()

    def perform_destroy(self, instance):
        """
        Prevent deleting guests not owned by the user.
        """
        if instance.owner != self.request.user:
            raise PermissionDenied("You do not own this guest.")

        instance.delete()
