from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from ..models import SiteConfiguration, FAQ
from ..serializers import SiteConfigurationSerializer, FAQSerializer
from rest_framework.permissions import AllowAny 

class SiteConfigDetailView(APIView):
    permission_classes = [AllowAny] # Allow anyone to see the footer/about info
    """
    Returns the global site settings as a single object.
    """
    def get(self, request):
        # We grab the first (and presumably only) config object
        config = SiteConfiguration.objects.first()
        if config:
            serializer = SiteConfigurationSerializer(config)
            return Response(serializer.data)
        return Response({"error": "No configuration found"}, status=404)


class FAQListView(generics.ListAPIView):
    """
    Returns a list of all active FAQs, ordered by the 'order' field.
    """
    permission_classes = [AllowAny] 
    serializer_class = FAQSerializer

    def get_queryset(self):
        return FAQ.objects.filter(is_active=True)


# views/information_views.py
from rest_framework import generics
from api.models import Information
from api.serializers import InformationSerializer


class InformationListView(generics.ListAPIView):
    permission_classes = [AllowAny] 
    queryset = Information.objects.all()
    serializer_class = InformationSerializer
