from django.shortcuts import render
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework import viewsets

from .models import Transportation, Vehicle
from .serializers import TransportationSerializer, VehicleSerializer


class TransportationViewSet(viewsets.ModelViewSet):
     permission_classes = [AllowAny]

     serializer_class= TransportationSerializer

     queryset = Transportation.objects.all()

class VehicleViewSet(viewsets.ModelViewSet):
     permission_classes = [AllowAny]

     serializer_class= VehicleSerializer

     queryset = Vehicle.objects.all()