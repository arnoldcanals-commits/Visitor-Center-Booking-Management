from rest_framework.permissions import IsAdminUser, AllowAny, IsAuthenticated
from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q

from api.models import User
from .models import (
    Transportation,
    Vehicle,
    Location,
    TransportationStop,
    TransportPassenger,
)
from .serializers import (
    TransportationSerializer,
    VehicleSerializer,
    LocationSerializer,
    DriverMinimalSerializer,
    TransportationStopSerializer,
    TransportPassengerSerializer,
    TransportationDriverStatusSerializer,
)


# =======================================================================
# ADMIN — full CRUD, staff only
# =======================================================================

class TransportationAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = TransportationSerializer
    queryset = Transportation.objects.select_related(
        'vehicle', 'vehicle__driver', 'driver',
    ).prefetch_related('stops', 'stops__location', 'passengers').all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = [
        'category', 'sub_category', 'title', 'vehicle', 'driver',
        'vehicle__owner', 'vehicle__affiliate', 'status',
    ]


class VehicleAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = VehicleSerializer
    queryset = Vehicle.objects.select_related('driver').all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = [
        'category', 'sub_category', 'title', 'vehicle_name', 'plate_number',
        'driver', 'owner', 'affiliate', 'status',
    ]


class LocationAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = LocationSerializer
    queryset = Location.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['name', 'address']


class DriverAdminViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only list of users eligible to be assigned as a driver.
    Lives here (rather than a separate users app) since it's only
    ever consumed as a lookup list for the transport admin forms.
    """
    permission_classes = [IsAdminUser]
    serializer_class = DriverMinimalSerializer
    queryset = User.objects.filter(role='driver').order_by('username')


class TransportationStopAdminViewSet(viewsets.ModelViewSet):
    """
    Full CRUD over stops, nested under a Transportation via URL kwarg
    `transportation_pk` (adjust to match your router config, e.g.
    DRF-nested-routers or a plain `?transportation=<id>` query param).
    """
    permission_classes = [IsAdminUser]
    serializer_class = TransportationStopSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['transportation', 'sequence']

    def get_queryset(self):
        qs = TransportationStop.objects.select_related('transportation', 'location').all()
        transportation_pk = self.kwargs.get('transportation_pk')
        if transportation_pk:
            qs = qs.filter(transportation_id=transportation_pk)
        return qs

    def perform_create(self, serializer):
        transportation_pk = self.kwargs.get('transportation_pk') or self.request.data.get('transportation')
        serializer.save(transportation_id=transportation_pk)


class TransportPassengerAdminViewSet(viewsets.ModelViewSet):
    """
    Full CRUD over passengers, nested under a Transportation via URL kwarg
    `transportation_pk`. Also exposes bulk turnover / early-departure actions.
    """
    permission_classes = [IsAdminUser]
    serializer_class = TransportPassengerSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['transportation', 'status', 'boarding_stop', 'alighting_stop']

    def get_queryset(self):
        qs = TransportPassenger.objects.select_related(
            'transportation', 'boarding_stop', 'alighting_stop'
        ).all()
        transportation_pk = self.kwargs.get('transportation_pk')
        if transportation_pk:
            qs = qs.filter(transportation_id=transportation_pk)
        return qs

    def perform_create(self, serializer):
        transportation_pk = self.kwargs.get('transportation_pk') or self.request.data.get('transportation')
        serializer.save(transportation_id=transportation_pk)

    @action(detail=False, methods=['post'], url_path='mark-alighted')
    def mark_alighted(self, request, transportation_pk=None):
        """Bulk turnover: POST {"stop_id": <id>} — marks everyone alighting there as completed."""
        stop_id = request.data.get('stop_id')
        if not stop_id:
            return Response({'detail': 'stop_id is required.'}, status=400)
        try:
            stop = TransportationStop.objects.get(pk=stop_id, transportation_id=transportation_pk)
        except TransportationStop.DoesNotExist:
            return Response({'detail': 'Stop not found on this trip.'}, status=404)

        transportation = stop.transportation
        updated_count = transportation.mark_alighted_at_stop(stop)
        return Response({'updated': updated_count})

    @action(detail=True, methods=['post'], url_path='depart-early')
    def depart_early(self, request, pk=None, transportation_pk=None):
        """Sudden/unplanned early departure. POST {"stop_id": <id>, "reason": "..."}"""
        passenger = self.get_object()
        stop_id = request.data.get('stop_id')
        reason = request.data.get('reason')
        if not stop_id:
            return Response({'detail': 'stop_id is required.'}, status=400)
        try:
            stop = TransportationStop.objects.get(pk=stop_id, transportation_id=passenger.transportation_id)
        except TransportationStop.DoesNotExist:
            return Response({'detail': 'Stop not found on this trip.'}, status=404)

        passenger.transportation.depart_passenger_early(passenger, stop, reason=reason)
        return Response(TransportPassengerSerializer(passenger).data)


# =======================================================================
# DRIVER — status updates only, restricted to assigned trips
# =======================================================================

class TransportationDriverViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    A driver can see and update the status/actual times/notes of trips
    they're assigned to — either directly (`Transportation.driver`) or
    via the vehicle they normally drive (`Vehicle.driver`). No create
    or delete, and no access to fields outside that serializer.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = TransportationDriverStatusSerializer

    def get_queryset(self):
        user = self.request.user
        return Transportation.objects.select_related('vehicle', 'driver').filter(
            Q(driver=user) | Q(vehicle__driver=user)
        )

    def perform_update(self, serializer):
        # Extra guard in case get_object() is ever bypassed (defense in depth) —
        # the serializer's validate() already enforces this, but double-checking
        # here costs nothing and keeps this viewset safe if the serializer ever changes.
        transportation = self.get_object()
        user = self.request.user
        is_assigned = transportation.driver_id == user.id or (
            transportation.vehicle_id and transportation.vehicle.driver_id == user.id
        )
        if not is_assigned:
            raise PermissionDenied("You are not the driver assigned to this trip.")
        serializer.save()


# =======================================================================
# CLIENT — read only, open to any user, filterable
# =======================================================================

class TransportationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = TransportationSerializer
    queryset = Transportation.objects.select_related(
        'vehicle', 'vehicle__driver', 'driver',
    ).prefetch_related('stops', 'stops__location', 'passengers').filter(is_active=True)
    filter_backends = [DjangoFilterBackend]
    filterset_fields = [
        'category', 'sub_category', 'title', 'vehicle', 'driver',
        'vehicle__owner', 'vehicle__affiliate', 'status',
    ]


class VehicleViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = VehicleSerializer
    queryset = Vehicle.objects.select_related('driver').filter(is_active=True)
    filter_backends = [DjangoFilterBackend]
    filterset_fields = [
        'category', 'sub_category', 'title', 'vehicle_name', 'plate_number',
        'driver', 'owner', 'affiliate', 'status',
    ]


class LocationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = LocationSerializer
    queryset = Location.objects.filter(is_active=True)
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['name', 'address']