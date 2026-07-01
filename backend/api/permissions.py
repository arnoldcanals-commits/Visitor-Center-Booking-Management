from rest_framework.permissions import BasePermission

class IsStationStaff(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "station_staff"
        )
