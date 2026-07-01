from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from ..models import (
    User,
    Booking,
    Guest,
    TourPackage,
    TourEvent,
    QRCode,

    Permit,
    PermitTemplate,
    Report,
    Notification,
    AuditLog,
    Qualification,
    PermitType,
    Station,
)

from ..serializers import (
    StaffTokenObtainPairSerializer,
    StaffUserSerializer,
    StaffBookingSerializer,
    StaffGuestSerializer,
    StaffTourPackageSerializer,
    StaffTourEventSerializer,
    StaffQRCodeSerializer,

    StaffPermitSerializer,
    StaffPermitTemplateSerializer,
    StaffReportSerializer,
    StaffNotificationSerializer,
    StaffAuditLogSerializer,
    StaffQualificationSerializer,
    StaffPermitTypeSerializer,
    StaffStationSerializer,
)

# ================= BILLING (DO NOT TOUCH) ===================
from billing.models import Bill, BillItem, BillTemplate, FeeType
from billing.serializers.staff import (
    StaffBillSerializer,
    StaffBillItemSerializer,
    StaffBillTemplateSerializer,
    StaffFeeTypeSerializer,
)

# ============================================================
# Staff TOKEN VIEWS
# ============================================================
class StaffTokenObtainPairView(TokenObtainPairView):
    serializer_class = StaffTokenObtainPairSerializer


class StaffTokenRefreshView(TokenRefreshView):
    pass


# ============================================================
# BASE Staff GENERIC VIEW MIXIN
# ============================================================
class StaffRequestMixin:
    def get_serializer_context(self):
        return {"request": self.request}


# ============================================================
# Staff ALL DATA VIEW
# ============================================================
class StaffAllDataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = {
            "users": StaffUserSerializer(
                User.objects.all(), many=True, context={"request": request}
            ).data,
            "bookings": StaffBookingSerializer(
                Booking.objects.all(), many=True, context={"request": request}
            ).data,
            "guests": StaffGuestSerializer(
                Guest.objects.all(), many=True, context={"request": request}
            ).data,
            "packages": StaffTourPackageSerializer(
                TourPackage.objects.prefetch_related("images"),
                many=True,
                context={"request": request},
            ).data,
            "events": StaffTourEventSerializer(
                TourEvent.objects.all(), many=True, context={"request": request}
            ).data,
            "qrcodes": StaffQRCodeSerializer(
                QRCode.objects.all(), many=True, context={"request": request}
            ).data,
            
            "permits": StaffPermitSerializer(
                Permit.objects.all(), many=True, context={"request": request}
            ).data,
            "permit_templates": StaffPermitTemplateSerializer(
                PermitTemplate.objects.all(), many=True, context={"request": request}
            ).data,
            "reports": StaffReportSerializer(
                Report.objects.all(), many=True, context={"request": request}
            ).data,
            "notifications": StaffNotificationSerializer(
                Notification.objects.all(), many=True, context={"request": request}
            ).data,
            "audit_logs": StaffAuditLogSerializer(
                AuditLog.objects.all(), many=True, context={"request": request}
            ).data,

            "qualifications": StaffQualificationSerializer(
                Qualification.objects.all(), many=True, context={"request": request}
            ).data,
            "permit_types": StaffPermitTypeSerializer(
                PermitType.objects.all(), many=True, context={"request": request}
            ).data,
            "stations": StaffStationSerializer(
                Station.objects.all(), many=True, context={"request": request}
            ).data,


            # ---------------- BILLING ----------------
            "bills": StaffBillSerializer(
                Bill.objects.all(), many=True, context={"request": request}
            ).data,
            "bill_items": StaffBillItemSerializer(
                BillItem.objects.all(), many=True, context={"request": request}
            ).data,
            "bill_templates": StaffBillTemplateSerializer(
                BillTemplate.objects.all(), many=True, context={"request": request}
            ).data,
            "fee_types": StaffFeeTypeSerializer(
                FeeType.objects.all(), many=True, context={"request": request}
            ).data,
        }

        return Response(data)


# ============================================================
# USER VIEWS
# ============================================================
class StaffUserListCreateView(StaffRequestMixin, generics.ListCreateAPIView):
    queryset = User.objects.all()
    serializer_class = StaffUserSerializer
    permission_classes = [IsAuthenticated]


class StaffUserDetailView(StaffRequestMixin, generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = StaffUserSerializer
    permission_classes = [IsAuthenticated]


class StaffUserUpdateView(StaffRequestMixin, generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = StaffUserSerializer
    permission_classes = [IsAuthenticated]


class StaffUserDeleteView(generics.DestroyAPIView):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]


# ============================================================
# BOOKING VIEWS
# ============================================================
class StaffBookingListCreateView(StaffRequestMixin, generics.ListCreateAPIView):
    queryset = Booking.objects.all()
    serializer_class = StaffBookingSerializer
    permission_classes = [IsAuthenticated]


class StaffBookingDetailView(StaffRequestMixin, generics.RetrieveAPIView):
    queryset = Booking.objects.all()
    serializer_class = StaffBookingSerializer
    permission_classes = [IsAuthenticated]


class StaffBookingUpdateView(StaffRequestMixin, generics.UpdateAPIView):
    queryset = Booking.objects.all()
    serializer_class = StaffBookingSerializer
    permission_classes = [IsAuthenticated]


class StaffBookingDeleteView(generics.DestroyAPIView):
    queryset = Booking.objects.all()
    permission_classes = [IsAuthenticated]


# ============================================================
# GUEST VIEWS
# ============================================================
class StaffGuestListCreateView(StaffRequestMixin, generics.ListCreateAPIView):
    queryset = Guest.objects.all()
    serializer_class = StaffGuestSerializer
    permission_classes = [IsAuthenticated]


class StaffGuestDetailView(StaffRequestMixin, generics.RetrieveAPIView):
    queryset = Guest.objects.all()
    serializer_class = StaffGuestSerializer
    permission_classes = [IsAuthenticated]


class StaffGuestUpdateView(StaffRequestMixin, generics.UpdateAPIView):
    queryset = Guest.objects.all()
    serializer_class = StaffGuestSerializer
    permission_classes = [IsAuthenticated]


class StaffGuestDeleteView(generics.DestroyAPIView):
    queryset = Guest.objects.all()
    permission_classes = [IsAuthenticated]


# ============================================================
# TOUR PACKAGE VIEWS
# ============================================================
class StaffTourPackageListCreateView(StaffRequestMixin, generics.ListCreateAPIView):
    queryset = TourPackage.objects.all()
    serializer_class = StaffTourPackageSerializer
    permission_classes = [IsAuthenticated]


class StaffTourPackageDetailView(StaffRequestMixin, generics.RetrieveAPIView):
    queryset = TourPackage.objects.all()
    serializer_class = StaffTourPackageSerializer
    permission_classes = [IsAuthenticated]


class StaffTourPackageUpdateView(StaffRequestMixin, generics.UpdateAPIView):
    queryset = TourPackage.objects.all()
    serializer_class = StaffTourPackageSerializer
    permission_classes = [IsAuthenticated]


class StaffTourPackageDeleteView(generics.DestroyAPIView):
    queryset = TourPackage.objects.all()
    permission_classes = [IsAuthenticated]


# ============================================================
# TOUR EVENT VIEWS
# ============================================================
class StaffTourEventListCreateView(StaffRequestMixin, generics.ListCreateAPIView):
    queryset = TourEvent.objects.all()
    serializer_class = StaffTourEventSerializer
    permission_classes = [IsAuthenticated]


class StaffTourEventDetailView(StaffRequestMixin, generics.RetrieveAPIView):
    queryset = TourEvent.objects.all()
    serializer_class = StaffTourEventSerializer
    permission_classes = [IsAuthenticated]


class StaffTourEventUpdateView(StaffRequestMixin, generics.UpdateAPIView):
    queryset = TourEvent.objects.all()
    serializer_class = StaffTourEventSerializer
    permission_classes = [IsAuthenticated]


class StaffTourEventDeleteView(generics.DestroyAPIView):
    queryset = TourEvent.objects.all()
    permission_classes = [IsAuthenticated]


# ============================================================
# QR CODE VIEWS
# ============================================================
class StaffQRCodeListCreateView(StaffRequestMixin, generics.ListCreateAPIView):
    queryset = QRCode.objects.all()
    serializer_class = StaffQRCodeSerializer
    permission_classes = [IsAuthenticated]


class StaffQRCodeDetailView(StaffRequestMixin, generics.RetrieveAPIView):
    queryset = QRCode.objects.all()
    serializer_class = StaffQRCodeSerializer
    permission_classes = [IsAuthenticated]


class StaffQRCodeUpdateView(StaffRequestMixin, generics.UpdateAPIView):
    queryset = QRCode.objects.all()
    serializer_class = StaffQRCodeSerializer
    permission_classes = [IsAuthenticated]


class StaffQRCodeDeleteView(generics.DestroyAPIView):
    queryset = QRCode.objects.all()
    permission_classes = [IsAuthenticated]



# ============================================================
# PERMIT VIEWS
# ============================================================
class StaffPermitListCreateView(StaffRequestMixin, generics.ListCreateAPIView):
    queryset = Permit.objects.all()
    serializer_class = StaffPermitSerializer
    permission_classes = [IsAuthenticated]


class StaffPermitDetailView(StaffRequestMixin, generics.RetrieveAPIView):
    queryset = Permit.objects.all()
    serializer_class = StaffPermitSerializer
    permission_classes = [IsAuthenticated]


class StaffPermitUpdateView(StaffRequestMixin, generics.UpdateAPIView):
    queryset = Permit.objects.all()
    serializer_class = StaffPermitSerializer
    permission_classes = [IsAuthenticated]


class StaffPermitDeleteView(generics.DestroyAPIView):
    queryset = Permit.objects.all()
    permission_classes = [IsAuthenticated]


# ============================================================
# PERMIT TEMPLATE VIEWS
# ============================================================
class StaffPermitTemplateListCreateView(StaffRequestMixin, generics.ListCreateAPIView):
    queryset = PermitTemplate.objects.all()
    serializer_class = StaffPermitTemplateSerializer
    permission_classes = [IsAuthenticated]


class StaffPermitTemplateDetailView(StaffRequestMixin, generics.RetrieveAPIView):
    queryset = PermitTemplate.objects.all()
    serializer_class = StaffPermitTemplateSerializer
    permission_classes = [IsAuthenticated]


class StaffPermitTemplateUpdateView(StaffRequestMixin, generics.UpdateAPIView):
    queryset = PermitTemplate.objects.all()
    serializer_class = StaffPermitTemplateSerializer
    permission_classes = [IsAuthenticated]


class StaffPermitTemplateDeleteView(generics.DestroyAPIView):
    queryset = PermitTemplate.objects.all()
    permission_classes = [IsAuthenticated]


# ============================================================
# REPORT VIEWS
# ============================================================
class StaffReportListCreateView(StaffRequestMixin, generics.ListCreateAPIView):
    queryset = Report.objects.all()
    serializer_class = StaffReportSerializer
    permission_classes = [IsAuthenticated]


class StaffReportDetailView(StaffRequestMixin, generics.RetrieveAPIView):
    queryset = Report.objects.all()
    serializer_class = StaffReportSerializer
    permission_classes = [IsAuthenticated]


class StaffReportUpdateView(StaffRequestMixin, generics.UpdateAPIView):
    queryset = Report.objects.all()
    serializer_class = StaffReportSerializer
    permission_classes = [IsAuthenticated]


class StaffReportDeleteView(generics.DestroyAPIView):
    queryset = Report.objects.all()
    permission_classes = [IsAuthenticated]


# ============================================================
# NOTIFICATION VIEWS
# ============================================================
class StaffNotificationListView(StaffRequestMixin, generics.ListAPIView):
    queryset = Notification.objects.all()
    serializer_class = StaffNotificationSerializer
    permission_classes = [IsAuthenticated]


class StaffNotificationDetailView(StaffRequestMixin, generics.RetrieveAPIView):
    queryset = Notification.objects.all()
    serializer_class = StaffNotificationSerializer
    permission_classes = [IsAuthenticated]


class StaffNotificationMarkReadView(StaffRequestMixin, generics.UpdateAPIView):
    queryset = Notification.objects.all()
    serializer_class = StaffNotificationSerializer
    permission_classes = [IsAuthenticated]

    def update(self, request, *args, **kwargs):
        notif = self.get_object()
        notif.is_read = True
        notif.save()
        return Response(self.get_serializer(notif).data)


# ============================================================
# AUDIT LOG VIEWS (READ-ONLY)
# ============================================================
class StaffAuditLogListView(StaffRequestMixin, generics.ListAPIView):
    queryset = AuditLog.objects.all().order_by("-created_at")
    serializer_class = StaffAuditLogSerializer
    permission_classes = [IsAuthenticated]


class StaffAuditLogDetailView(StaffRequestMixin, generics.RetrieveAPIView):
    queryset = AuditLog.objects.all()
    serializer_class = StaffAuditLogSerializer
    permission_classes = [IsAuthenticated]

# ============================================================
# QUALIFICATION VIEWS
# ============================================================
class StaffQualificationListCreateView(StaffRequestMixin, generics.ListCreateAPIView):
    queryset = Qualification.objects.all()
    serializer_class = StaffQualificationSerializer
    permission_classes = [IsAuthenticated]


class StaffQualificationDetailView(StaffRequestMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Qualification.objects.all()
    serializer_class = StaffQualificationSerializer
    permission_classes = [IsAuthenticated]


# ============================================================
# PERMIT TYPE VIEWS
# ============================================================
class StaffPermitTypeListCreateView(StaffRequestMixin, generics.ListCreateAPIView):
    queryset = PermitType.objects.all()
    serializer_class = StaffPermitTypeSerializer
    permission_classes = [IsAuthenticated]


class StaffPermitTypeDetailView(StaffRequestMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = PermitType.objects.all()
    serializer_class = StaffPermitTypeSerializer
    permission_classes = [IsAuthenticated]


# ============================================================
# STATION VIEWS
# ============================================================
class StaffStationListCreateView(StaffRequestMixin, generics.ListCreateAPIView):
    queryset = Station.objects.all()
    serializer_class = StaffStationSerializer
    permission_classes = [IsAuthenticated]


class StaffStationDetailView(StaffRequestMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Station.objects.all()
    serializer_class = StaffStationSerializer
    permission_classes = [IsAuthenticated]

