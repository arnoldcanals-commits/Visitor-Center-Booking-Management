from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import User
from ..serializers import AdminNewUserSerializer


class IsAdminRole(permissions.BasePermission):
    """
    Only staff or users with role == 'admin' can manage users here.
    """

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_staff or getattr(user, "role", None) == "admin")
        )


class UserAdminViewSet(viewsets.ModelViewSet):
    """
    Standalone user management endpoint. Deliberately independent of the
    old generic all-data / AdminDataContext machinery -- this is its own
    serializer, its own permissions, its own soft-delete/archive actions.
    """

    serializer_class = AdminNewUserSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        # Return everything (active/inactive, archived/unarchived) -- the
        # frontend is responsible for filtering by role/archived tab.
        return User.objects.all().order_by("-created_at")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.role == "admin":
            return Response(
                {"detail": "Admin users cannot be deleted."},
                status=status.HTTP_403_FORBIDDEN,
            )
        instance.delete()  # BaseModel.delete() -> soft delete (is_active=False)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["patch"], url_path="archive")
    def toggle_archive(self, request, pk=None):
        user = self.get_object()
        user.is_archived = not user.is_archived
        user.save(update_fields=["is_archived"])
        return Response(self.get_serializer(user).data)