from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter

from .views import (
    TransportationAdminViewSet, VehicleAdminViewSet, LocationAdminViewSet, DriverAdminViewSet,
    TransportationStopAdminViewSet, TransportPassengerAdminViewSet,
    TransportationDriverViewSet,
    TransportationViewSet, VehicleViewSet, LocationViewSet,
)

from .views import (
     AcceptTripView,
    AddWalkInPassengerView,
    AlightAtStopView,
    AlightPassengerView,
    ArriveAtStopView,
    CheckInPassengerView,
    DeclineTripView,
    DepartFromStopView,
    DriverProfileView,
    DriverTripDetailView,
    DriverTripListView,
    MarkNoShowView,
    ReportDelayView,
       AdminReservationListView,
    ApproveReservationView,
    RejectReservationView,
)

from .views import ReservationListCreateView, SavedGuestsView

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


    #driver url
  path("driver/profile/", DriverProfileView.as_view(), name="driver-profile"),
    path("driver/trips/", DriverTripListView.as_view(), name="driver-trips"),
    path("driver/trips/<str:trip_id>/", DriverTripDetailView.as_view(), name="driver-trip-detail"),
    # trip actions
    path("driver/trips/<str:trip_id>/accept/", AcceptTripView.as_view(), name="driver-trip-accept"),
    path("driver/trips/<str:trip_id>/decline/", DeclineTripView.as_view(), name="driver-trip-decline"),
    path("driver/trips/<str:trip_id>/delay/", ReportDelayView.as_view(), name="driver-trip-delay"),
    # stop actions
    path("driver/trips/<str:trip_id>/stops/<str:stop_id>/arrive/", ArriveAtStopView.as_view(), name="driver-stop-arrive"),
    path("driver/trips/<str:trip_id>/stops/<str:stop_id>/depart/", DepartFromStopView.as_view(), name="driver-stop-depart"),
    path("driver/trips/<str:trip_id>/stops/<str:stop_id>/alight/", AlightAtStopView.as_view(), name="driver-stop-alight"),
    path("driver/trips/<str:trip_id>/stops/<str:stop_id>/walk-in/", AddWalkInPassengerView.as_view(), name="driver-stop-walk-in"),
    # passenger actions
    path("driver/trips/<str:trip_id>/passengers/<str:passenger_id>/check-in/", CheckInPassengerView.as_view(), name="driver-passenger-check-in"),
    path("driver/trips/<str:trip_id>/passengers/<str:passenger_id>/no-show/", MarkNoShowView.as_view(), name="driver-passenger-no-show"),
    path("driver/trips/<str:trip_id>/passengers/<str:passenger_id>/alight/", AlightPassengerView.as_view(), name="driver-passenger-alight"),

    path("transport-reservations/guests/", SavedGuestsView.as_view(), name="reservation-guests"),
    path("transport-reservations/", ReservationListCreateView.as_view(), name="reservation-list-create"),


#admin
   path("transport-reservations/guests/", SavedGuestsView.as_view(), name="reservation-guests"),
    path("transport-reservations/", ReservationListCreateView.as_view(), name="reservation-list-create"),
    # admin side (Transportation Registry page)
    path("admin-transport/reservations/", AdminReservationListView.as_view(), name="admin-reservation-list"),
    path("admin-transport/reservations/<str:pk>/approve/", ApproveReservationView.as_view(), name="admin-reservation-approve"),
    path("admin-transport/reservations/<str:pk>/reject/", RejectReservationView.as_view(), name="admin-reservation-reject"),
]





 

 

