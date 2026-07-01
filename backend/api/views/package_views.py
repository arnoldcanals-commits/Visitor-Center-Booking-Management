from rest_framework import viewsets
from rest_framework import generics
from rest_framework.parsers import MultiPartParser, FormParser
from ..models import TourPackage, TourPackageImage
from ..serializers import TourPackageSerializer, TourPackageImageSerializer, PackageDetailSerializer
from rest_framework.permissions import AllowAny

class TourPackageViewSet(viewsets.ModelViewSet):
    queryset = TourPackage.objects.all()
    serializer_class = TourPackageSerializer
    permission_classes = [AllowAny]

class TourPackageImageViewSet(viewsets.ModelViewSet):
    queryset = TourPackageImage.objects.all()
    serializer_class = TourPackageImageSerializer
    parser_classes = (MultiPartParser, FormParser,)  # To handle image uploads


from django.db.models import Count

class PackageDetailView(generics.RetrieveAPIView):
    serializer_class = PackageDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "pk"
    queryset = TourPackage.objects.prefetch_related(
        "images", "events", "bookings__tourist"
    ).annotate(
        booking_count=Count("bookings", distinct=True)
    )


