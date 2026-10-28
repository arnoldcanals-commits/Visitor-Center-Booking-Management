from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter

from .views import (
    TransportationAdminViewSet, VehicleAdminViewSet, LocationAdminViewSet, DriverAdminViewSet,
    TransportationStopAdminViewSet, TransportPassengerAdminViewSet,
    TransportationDriverViewSet,
    TransportationViewSet, VehicleViewSet, LocationViewSet,
)

# Client-facing — read only
client_router = DefaultRouter()
client_router.register(r'transportation', TransportationViewSet, basename='transportation')
client_router.register(r'vehicle', VehicleViewSet, basename='vehicle')
client_router.register(r'location', LocationViewSet, basename='location')

# Driver-facing — assigned trips only, status updates
driver_router = DefaultRouter()
driver_router.register(r'transportation', TransportationDriverViewSet, basename='driver-transportation')

# Admin — full CRUD
admin_router = DefaultRouter()
admin_router.register(r'transportation', TransportationAdminViewSet, basename='admin-transportation')
admin_router.register(r'vehicle', VehicleAdminViewSet, basename='admin-vehicle')
admin_router.register(r'location', LocationAdminViewSet, basename='admin-location')
admin_router.register(r'driver', DriverAdminViewSet, basename='admin-driver')

# Nested under admin transportation: /admin-transport/transportation/<transportation_pk>/stops/
# and /admin-transport/transportation/<transportation_pk>/passengers/
admin_transportation_nested_router = NestedDefaultRouter(
    admin_router, r'transportation', lookup='transportation'
)
admin_transportation_nested_router.register(
    r'stops', TransportationStopAdminViewSet, basename='admin-transportation-stops'
)
admin_transportation_nested_router.register(
    r'passengers', TransportPassengerAdminViewSet, basename='admin-transportation-passengers'
)

urlpatterns = [
    path('admin-transport/', include(admin_router.urls)),
    path('admin-transport/', include(admin_transportation_nested_router.urls)),
    path('driver-transport/', include(driver_router.urls)),
    path('', include(client_router.urls)),
]