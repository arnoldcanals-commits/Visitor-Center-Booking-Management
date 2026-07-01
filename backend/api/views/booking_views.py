from rest_framework import generics, mixins, viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import (
    IsAuthenticated,
    IsAuthenticatedOrReadOnly,
    AllowAny,
)
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Prefetch

from ..models import (
    Booking,
    TourPackage,
    Review,
)
from ..serializers import (
    BookingSerializer,
    TourPackageSerializer,
    ReviewSerializer,
)


# ============================================================
# CREATE BOOKING (TOURIST)
# ============================================================
class BookingCreateView(generics.CreateAPIView):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.none()

    def get_serializer_context(self):
        return {"request": self.request}


# ============================================================
# USER BOOKINGS (LIST / RETRIEVE / UPDATE if pending)
# ============================================================
class UserBookingViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Booking.objects
            .filter(
                tourist=self.request.user,
                is_archived=False,
            )
            # ========= FK / O2O =========
            .select_related(
                "package",
                "event",
                "event__package",
                "event__assigned_guide",
                "assigned_guide",
                "permit",
                "itinerary",
            )
            # ========= JOIN / REVERSE =========
            .prefetch_related(
                "booking_guests__guest",
                "booking_guests__qrcode",
                "reviews",
            )
            .order_by("-booking_date")
        )

    def get_serializer_context(self):
        return {"request": self.request}

    def perform_update(self, serializer):
        booking = self.get_object()

        if booking.status != "pending":
            raise permissions.PermissionDenied(
                "You can only edit or cancel bookings while they are pending."
            )

        serializer.save()

    # Explicitly block DELETE
    def destroy(self, request, *args, **kwargs):
        raise permissions.PermissionDenied(
            "Bookings cannot be deleted."
        )


# ============================================================
# CREATE REVIEW (TOURIST)
# ============================================================
class ReviewCreateView(generics.CreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Review.objects.none()

    def get_serializer_context(self):
        return {"request": self.request}

class ReviewUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'
    def get_queryset(self):
        # Only allow users to update their own reviews
        return Review.objects.filter(reviewer=self.request.user)

    def get_serializer_context(self):
        return {"request": self.request}

    def get_serializer(self, *args, **kwargs):
        # Allow partial updates so PATCH doesn't require all fields
        kwargs['partial'] = True
        return super().get_serializer(*args, **kwargs)
    def perform_update(self, serializer):
        # This ensures the logic inside your serializer's update() 
        # is called correctly during a PATCH request
        serializer.save()
# ============================================================
# HOME PAGE
# ============================================================
@api_view(["GET"])
@permission_classes([IsAuthenticatedOrReadOnly])
def home(request):
    active_statuses = ["pending", "approved"]
    has_active_booking = False

    if request.user.is_authenticated:
        has_active_booking = Booking.objects.filter(
            tourist=request.user,
            status__in=active_statuses,
            is_archived=False,
        ).exists()

    packages = TourPackage.objects.all().order_by("name")
    serializer = TourPackageSerializer(packages, many=True)

    return Response({
        "authenticated": request.user.is_authenticated,
        "has_active_booking": has_active_booking,
        "packages": serializer.data,
    })

from ..serializers import UserProfileSerializer

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    def get_object(self):
    
    
        return self.request.user
    def perform_update(self, serializer):
        serializer.save()


from rest_framework import status, generics
from rest_framework.response import Response
from ..serializers import ChangePasswordSerializer

class ChangePasswordView(generics.UpdateAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Set the new password
        self.request.user.set_password(serializer.validated_data['new_password'])
        self.request.user.save()
        
        return Response({"message": "Password updated successfully"}, status=status.HTTP_200_OK)