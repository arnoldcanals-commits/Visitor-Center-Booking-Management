from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework import generics, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework import status

from ..models import *
from ..serializers import *

# ================= BILLING (DO NOT TOUCH) ===================
from billing.models import Bill, BillItem, BillTemplate, FeeType
from billing.serializers.admin import (
    AdminBillSerializer,
    AdminBillItemSerializer,
    AdminBillTemplateSerializer,
    AdminFeeTypeSerializer,
)

# ============================================================
# BASE ADMIN VIEWS
# ============================================================

class AdminBaseView:
    permission_classes = [IsAdminUser]

    def get_serializer_context(self):
        return {"request": self.request}


class AdminListCreateView(AdminBaseView, generics.ListCreateAPIView):
    pass


class AdminRetrieveUpdateDestroyView(
    AdminBaseView, generics.RetrieveUpdateDestroyAPIView
):
    pass


class AdminListView(AdminBaseView, generics.ListAPIView):
    pass


class AdminRetrieveView(AdminBaseView, generics.RetrieveAPIView):
    pass


class AdminDestroyView(AdminBaseView, generics.DestroyAPIView):
    pass


# ============================================================
# ADMIN TOKEN
# ============================================================

class AdminTokenObtainPairView(TokenObtainPairView):
    serializer_class = AdminTokenObtainPairSerializer


class AdminTokenRefreshView(TokenRefreshView):
    pass


# ============================================================
# ADMIN ALL DATA
# ============================================================

class AdminAllDataView(AdminBaseView, APIView):
    """
    Optimized summary view for the Admin Dashboard.
    Uses select_related and prefetch_related to prevent N+1 query issues.
    """
    def get(self, request):
        context = {"request": request}

        data = {
            "users": AdminUserSerializer(
                User.objects.prefetch_related("qualifications").all(), 
                many=True, context=context
            ).data,
            "bookings": AdminBookingSerializer(
                Booking.objects.select_related(
                    "tourist", "package", "event",
                    "assigned_guide", "itinerary"
                ).prefetch_related("booking_guests__guest", "booking_guests__qrcode"),
                many=True, context=context
            ).data,
            "packages": AdminTourPackageSerializer(
                TourPackage.objects.prefetch_related("images"),
                many=True, context=context
            ).data,
            "events": AdminTourEventSerializer(
                TourEvent.objects.select_related(
                    "package", "assigned_guide",
                    "required_qualification",
                    "required_permit_type",
                    "active_itinerary",
                ).prefetch_related("event_stations__station"),
                many=True, context=context
            ).data,
            "permits": AdminPermitSerializer(Permit.objects.all(), many=True, context=context).data,
            "reports": AdminReportSerializer(Report.objects.all(), many=True, context=context).data,
            "notifications": AdminNotificationSerializer(Notification.objects.all(), many=True, context=context).data,
            "audit_logs": AdminAuditLogSerializer(
                AuditLog.objects.all().order_by("-created_at")[:100], 
                many=True, context=context
            ).data,
            "reviews": AdminReviewSerializer(Review.objects.all(), many=True, context=context).data,
            # Billing
            "bills": AdminBillSerializer(Bill.objects.all(), many=True, context=context).data,
            "bill_items": AdminBillItemSerializer(BillItem.objects.all(), many=True, context=context).data,
            "bill_templates": AdminBillTemplateSerializer(BillTemplate.objects.all(), many=True, context=context).data,
            "fee_types": AdminFeeTypeSerializer(FeeType.objects.all(), many=True, context=context).data,
            "qualifications": AdminQualificationSerializer(Qualification.objects.all(), many=True, context=context).data,
            "permit_types": AdminPermitTypeSerializer(PermitType.objects.all(), many=True, context=context).data,
            "stations": AdminStationSerializer(Station.objects.all(), many=True, context=context).data,
            "faqs": AdminFAQSerializer(FAQ.objects.all(), many=True, context=context).data,
            "information": AdminInformationSerializer(Information.objects.all(), many=True, context=context).data,
            "system_settings": AdminSystemSettingSerializer(SystemSetting.objects.all(), many=True, context=context).data,
            "site_configuration": AdminSiteConfigurationSerializer(SiteConfiguration.objects.all(), many=True, context=context).data,
            "event_station_checks": AdminEventStationCheckSerializer(EventStationCheck.objects.all(), many=True, context=context).data,
          "event_station_guest_checks": AdminEventStationGuestCheckSerializer(
    EventStationGuestCheck.objects.select_related(
        'booking_guest__guest',       # Essential for Name/Age/Gender
        'event_station_check__event',  # Essential for filtering by Event on Map
        'event_station_check__station' # Essential for showing Station Name in Popups
    ).filter(checked=True),            # Only send checked-in data to the map
    many=True, 
    context=context
).data,
      
        }

        return Response(data)


# ============================================================
# USER & GUEST
# ============================================================

class AdminUserListCreateView(AdminListCreateView):
    queryset = User.objects.prefetch_related("qualifications").all()
    serializer_class = AdminUserSerializer


class AdminUserDetailView(AdminRetrieveUpdateDestroyView):
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer


class AdminGuestListCreateView(AdminListCreateView):
    queryset = Guest.objects.all()
    serializer_class = AdminGuestSerializer


class AdminGuestDetailView(AdminRetrieveUpdateDestroyView):
    queryset = Guest.objects.all()
    serializer_class = AdminGuestSerializer


# ============================================================
# BOOKING
# ============================================================

class AdminBookingListCreateView(AdminListCreateView):
    queryset = Booking.objects.all()
    serializer_class = AdminBookingSerializer


class AdminBookingDetailView(AdminRetrieveUpdateDestroyView):
    queryset = Booking.objects.all()
    serializer_class = AdminBookingSerializer

    # Logic Note: Removed automatic nulling of guide/itinerary to prevent 
    # accidental data loss during standard updates.


# ============================================================
# TOUR PACKAGE & EVENT
# ============================================================

class AdminTourPackageListCreateView(AdminListCreateView):
    queryset = TourPackage.objects.prefetch_related("images").all()
    serializer_class = AdminTourPackageSerializer


class AdminTourPackageDetailView(AdminRetrieveUpdateDestroyView):
    queryset = TourPackage.objects.all()
    serializer_class = AdminTourPackageSerializer


import json # Ensure this is at the top of your file

# ... other views ...

class AdminTourEventListCreateView(AdminListCreateView):
    serializer_class = AdminTourEventSerializer

    def get_queryset(self):
        return TourEvent.objects.select_related(
            "package", "assigned_guide", "active_itinerary"
        ).prefetch_related(
            "event_stations__station"
        )


    def create(self, request, *args, **kwargs):
        # 1. Copy data because request.data is immutable
        data = request.data.copy()
        
        # 2. Parse the JSON string from React's FormData
        if 'event_stations' in data and isinstance(data['event_stations'], str):
            try:
                data['event_stations'] = json.loads(data['event_stations'])
            except json.JSONDecodeError:
                pass

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class AdminTourEventDetailView(AdminRetrieveUpdateDestroyView):
    serializer_class = AdminTourEventSerializer

    def get_queryset(self):
        return TourEvent.objects.select_related(
            "package", "assigned_guide", "active_itinerary"
        ).prefetch_related(
            "event_stations__station"
        )


    def update(self, request, *args, **kwargs):
        # Handle the JSON string in Updates (PATCH/PUT)
        data = request.data.copy()
        if 'event_stations' in data and isinstance(data['event_stations'], str):
            try:
                data['event_stations'] = json.loads(data['event_stations'])
            except json.JSONDecodeError:
                pass
        
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def perform_update(self, serializer):
        event = serializer.save()
        # Your existing logic to sync bookings
        for booking in event.bookings.all():
            booking.save(update_fields=["assigned_guide", "itinerary"])
# ============================================================
# ITINERARY
# ============================================================

class AdminTourEventItineraryListCreateView(AdminListCreateView):
    queryset = TourEventItinerary.objects.all()
    serializer_class = AdminTourEventItinerarySerializer

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class AdminTourEventItineraryDetailView(AdminRetrieveUpdateDestroyView):
    queryset = TourEventItinerary.objects.all()
    serializer_class = AdminTourEventItinerarySerializer


# ============================================================
# QR CODES
# ============================================================

class AdminQRCodeListView(AdminListView):
    queryset = QRCode.objects.all()
    serializer_class = AdminQRCodeSerializer


class AdminQRCodeDetailView(AdminRetrieveView):
    queryset = QRCode.objects.all()
    serializer_class = AdminQRCodeSerializer


class AdminQRCodeDeleteView(AdminDestroyView):
    queryset = QRCode.objects.all()


# ============================================================
# COMPLIANCE (PERMIT / QUALIFICATION)
# ============================================================

class AdminPermitView(AdminRetrieveUpdateDestroyView):
    queryset = Permit.objects.all()
    serializer_class = AdminPermitSerializer


class AdminPermitTemplateView(AdminRetrieveUpdateDestroyView):
    queryset = PermitTemplate.objects.all()
    serializer_class = AdminPermitTemplateSerializer


class AdminQualificationListCreateView(AdminListCreateView):
    queryset = Qualification.objects.all()
    serializer_class = AdminQualificationSerializer


class AdminQualificationDetailView(AdminRetrieveUpdateDestroyView):
    queryset = Qualification.objects.all()
    serializer_class = AdminQualificationSerializer


class AdminPermitTypeListCreateView(AdminListCreateView):
    queryset = PermitType.objects.all()
    serializer_class = AdminPermitTypeSerializer


class AdminPermitTypeDetailView(AdminRetrieveUpdateDestroyView):
    queryset = PermitType.objects.all()
    serializer_class = AdminPermitTypeSerializer


# ============================================================
# LOGS, REPORTS & NOTIFICATIONS
# ============================================================

class AdminReportView(AdminRetrieveUpdateDestroyView):
    queryset = Report.objects.all()
    serializer_class = AdminReportSerializer

# Add this class
class AdminReportListCreateView(AdminListCreateView):
    queryset = Report.objects.all()
    serializer_class = AdminReportSerializer

# Keep your existing one for Detail/Update/Delete
class AdminReportDetailView(AdminRetrieveUpdateDestroyView):
    queryset = Report.objects.all()
    serializer_class = AdminReportSerializer
    
class AdminNotificationListView(AdminListView):
    queryset = Notification.objects.all()
    serializer_class = AdminNotificationSerializer


class AdminNotificationDetailView(AdminRetrieveView):
    queryset = Notification.objects.all()
    serializer_class = AdminNotificationSerializer


class AdminNotificationMarkReadView(AdminRetrieveUpdateDestroyView):
    queryset = Notification.objects.all()
    serializer_class = AdminNotificationSerializer

    def update(self, request, *args, **kwargs):
        notif = self.get_object()
        notif.is_read = True
        notif.save()
        return Response(self.get_serializer(notif).data)


class AdminAuditLogListView(AdminListView):
    queryset = AuditLog.objects.all().order_by("-created_at")
    serializer_class = AdminAuditLogSerializer


class AdminAuditLogDetailView(AdminRetrieveView):
    queryset = AuditLog.objects.all()
    serializer_class = AdminAuditLogSerializer


# ============================================================
# STATION & CHECKS
# ============================================================

class AdminStationListCreateView(AdminListCreateView):
    queryset = Station.objects.all()
    serializer_class = AdminStationSerializer

    def perform_create(self, serializer):
        self._validate_staff(serializer)

    def _validate_staff(self, serializer):
        station = serializer.save()
        invalid = station.staff.exclude(role="station_staff")
        if invalid.exists():
            raise serializers.ValidationError(
                "Only station staff can be assigned to a station."
            )


class AdminStationDetailView(AdminRetrieveUpdateDestroyView):
    queryset = Station.objects.all()
    serializer_class = AdminStationSerializer

    def perform_update(self, serializer):
        # Apply same validation on update
        station = serializer.save()
        if station.staff.exclude(role="station_staff").exists():
            raise serializers.ValidationError(
                "Only station staff can be assigned to a station."
            )


class AdminEventStationCheckListView(AdminListView):
    queryset = EventStationCheck.objects.select_related('guide_check').prefetch_related('guest_checks')
    serializer_class = AdminEventStationCheckSerializer


class AdminEventStationCheckDetailView(AdminRetrieveView):
    queryset = EventStationCheck.objects.all()
    serializer_class = AdminEventStationCheckSerializer


# ============================================================
# REVIEWS & CMS (FAQ/INFO/SETTINGS)
# ============================================================

class AdminReviewListView(AdminListView):
    queryset = Review.objects.all()
    serializer_class = AdminReviewSerializer


class AdminReviewDetailView(AdminRetrieveUpdateDestroyView):
    queryset = Review.objects.all()
    serializer_class = AdminReviewSerializer


class AdminFAQListCreateView(AdminListCreateView):
    queryset = FAQ.objects.all()
    serializer_class = AdminFAQSerializer


class AdminFAQDetailView(AdminRetrieveUpdateDestroyView):
    queryset = FAQ.objects.all()
    serializer_class = AdminFAQSerializer


class AdminInformationListCreateView(AdminListCreateView):
    queryset = Information.objects.all()
    serializer_class = AdminInformationSerializer


class AdminInformationDetailView(AdminRetrieveUpdateDestroyView):
    queryset = Information.objects.all()
    serializer_class = AdminInformationSerializer


class AdminSiteConfigurationView(AdminRetrieveUpdateDestroyView):
    queryset = SiteConfiguration.objects.all()
    serializer_class = AdminSiteConfigurationSerializer


class AdminSystemSettingView(AdminRetrieveUpdateDestroyView):
    queryset = SystemSetting.objects.all()
    serializer_class = AdminSystemSettingSerializer