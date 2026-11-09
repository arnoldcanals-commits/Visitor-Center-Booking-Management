from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static

from ..views import *
from api.views import (
    TourPackageViewSet,
    TourPackageImageViewSet,
    PackageDetailView,
    CurrentUserView,
    home,
    BookingCreateView,
    UserBookingViewSet,
)





# ============================================================
# ROUTER
# ============================================================
router = DefaultRouter()
router.register("booking_staff/packages", TourPackageViewSet)
router.register("booking_staff/package-images", TourPackageImageViewSet)


from ..views import SiteConfigDetailView, FAQListView


# ============================================================
# URLPATTERNS
# ============================================================
urlpatterns = [
    # -------------------
    # Staff AUTH
    # -------------------
    path("booking_staff/token/", StaffTokenObtainPairView.as_view(), name="Staff_token"),
    path("booking_staff/token/refresh/", StaffTokenRefreshView.as_view(), name="Staff_refresh"),
    path("booking_staff/all-data/", StaffAllDataView.as_view(), name="staff-all-data"),

    # -------------------
    # USERS
    # -------------------
    path("booking_staff/users/", StaffUserListCreateView.as_view(), name="staff-users"),
    path("booking_staff/users/<int:pk>/", StaffUserDetailView.as_view(), name="staff-user-detail"),
    path("booking_staff/users/<int:pk>/update/", StaffUserUpdateView.as_view(), name="staff-user-update"),
    path("booking_staff/users/<int:pk>/delete/", StaffUserDeleteView.as_view(), name="staff-user-delete"),

    # -------------------
    # BOOKINGS
    # -------------------
    path("booking_staff/bookings/", StaffBookingListCreateView.as_view(), name="staff-bookings"),
    path("booking_staff/bookings/<int:pk>/", StaffBookingDetailView.as_view(), name="staff-booking-detail"),
    path("booking_staff/bookings/<int:pk>/update/", StaffBookingUpdateView.as_view(), name="staff-booking-update"),
    path("booking_staff/bookings/<int:pk>/delete/", StaffBookingDeleteView.as_view(), name="staff-booking-delete"),

    # -------------------
    # GUESTS
    # -------------------
    path("booking_staff/guests/", StaffGuestListCreateView.as_view(), name="staff-guests"),
    path("booking_staff/guests/<int:pk>/", StaffGuestDetailView.as_view(), name="staff-guest-detail"),
    path("booking_staff/guests/<int:pk>/update/", StaffGuestUpdateView.as_view(), name="staff-guest-update"),
    path("booking_staff/guests/<int:pk>/delete/", StaffGuestDeleteView.as_view(), name="staff-guest-delete"),

    # -------------------
    # TOUR PACKAGES
    # -------------------
    path("booking_staff/packages/", StaffTourPackageListCreateView.as_view(), name="staff-packages"),
    path("booking_staff/packages/<int:pk>/", StaffTourPackageDetailView.as_view(), name="staff-package-detail"),
    path("booking_staff/packages/<int:pk>/update/", StaffTourPackageUpdateView.as_view(), name="staff-package-update"),
    path("booking_staff/packages/<int:pk>/delete/", StaffTourPackageDeleteView.as_view(), name="staff-package-delete"),

    # -------------------
    # TOUR EVENTS
    # -------------------
    path("booking_staff/events/", StaffTourEventListCreateView.as_view(), name="staff-events"),
    path("booking_staff/events/<int:pk>/", StaffTourEventDetailView.as_view(), name="staff-event-detail"),
    path("booking_staff/events/<int:pk>/update/", StaffTourEventUpdateView.as_view(), name="staff-event-update"),
    path("booking_staff/events/<int:pk>/delete/", StaffTourEventDeleteView.as_view(), name="staff-event-delete"),

    # -------------------
    # QR CODES
    # -------------------
    path("booking_staff/qrcodes/", StaffQRCodeListCreateView.as_view(), name="staff-qrcodes"),
    path("booking_staff/qrcodes/<int:pk>/", StaffQRCodeDetailView.as_view(), name="staff-qrcode-detail"),
    path("booking_staff/qrcodes/<int:pk>/update/", StaffQRCodeUpdateView.as_view(), name="staff-qrcode-update"),
    path("booking_staff/qrcodes/<int:pk>/delete/", StaffQRCodeDeleteView.as_view(), name="staff-qrcode-delete"),


    # -------------------
    # PERMITS
    # -------------------
    path("booking_staff/permits/", StaffPermitListCreateView.as_view(), name="staff-permits"),
    path("booking_staff/permits/<int:pk>/", StaffPermitDetailView.as_view(), name="staff-permit-detail"),
    path("booking_staff/permits/<int:pk>/update/", StaffPermitUpdateView.as_view(), name="staff-permit-update"),
    path("booking_staff/permits/<int:pk>/delete/", StaffPermitDeleteView.as_view(), name="staff-permit-delete"),

    # -------------------
    # PERMIT TEMPLATES
    # -------------------
    path("booking_staff/permit-templates/", StaffPermitTemplateListCreateView.as_view(), name="staff-permit-templates"),
    path("booking_staff/permit-templates/<int:pk>/", StaffPermitTemplateDetailView.as_view(), name="staff-permit-template-detail"),
    path("booking_staff/permit-templates/<int:pk>/update/", StaffPermitTemplateUpdateView.as_view(), name="staff-permit-template-update"),
    path("booking_staff/permit-templates/<int:pk>/delete/", StaffPermitTemplateDeleteView.as_view(), name="staff-permit-template-delete"),

    # -------------------
    # REPORTS
    # -------------------
    path("booking_staff/reports/", StaffReportListCreateView.as_view(), name="staff-reports"),
    path("booking_staff/reports/<int:pk>/", StaffReportDetailView.as_view(), name="staff-report-detail"),
    path("booking_staff/reports/<int:pk>/update/", StaffReportUpdateView.as_view(), name="staff-report-update"),
    path("booking_staff/reports/<int:pk>/delete/", StaffReportDeleteView.as_view(), name="staff-report-delete"),


    # -------------------
    # NOTIFICATIONS
    # -------------------
    path("booking_staff/notifications/", StaffNotificationListView.as_view(), name="staff-notifications"),
    path("booking_staff/notifications/<int:pk>/", StaffNotificationDetailView.as_view(), name="staff-notification-detail"),
    path("booking_staff/notifications/<int:pk>/mark-read/", StaffNotificationMarkReadView.as_view(), name="staff-notification-mark-read"),

    # -------------------
    # AUDIT LOGS
    # -------------------
    path("booking_staff/audit-logs/", StaffAuditLogListView.as_view(), name="staff-audit-logs"),
    path("booking_staff/audit-logs/<int:pk>/", StaffAuditLogDetailView.as_view(), name="staff-audit-log-detail"),

    # Router URLs
    path("", include(router.urls)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
