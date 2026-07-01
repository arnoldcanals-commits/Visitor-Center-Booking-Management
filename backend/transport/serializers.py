from rest_framework import serializers
from .models import Transportation, Vehicle

class TransportationSerializer(serializers.ModelSerializer):

    class Meta:

        model = Transportation
        fields = '__all__'

class VehicleSerializer(serializers.ModelSerializer):

    class Meta:

        model = Vehicle
        fields = '__all__'