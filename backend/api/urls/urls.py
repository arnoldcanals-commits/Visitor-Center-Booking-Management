from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static

# Import all admin views from your local views file
from ..views import *

# Public/User Views (kept as requested)
from api.views import (
    TourPackageViewSet,
    TourPackageImageViewSet,
    PackageDetailView,
    CurrentUserView,
    home,
    BookingCreateView,
    UserBookingViewSet,
    LoginView,
    ReviewCreateView,
    ReviewUpdateView,
    VerifyEmailView,
    ForgotPasswordView,
    ResetPasswordView,
    SiteConfigDetailView,
    FAQListView,
    InformationListView,
)

# ============================================================
# ROUTER
# ============================================================
router = DefaultRouter()
# Note: Keep these if you still need the ViewSet logic for public-facing apps
router.register("site_admin/packages-legacy", TourPackageViewSet, basename='legacy-packages')
router.register(r'notifications', NotificationViewSet, basename='notification')
# ============================================================
# URLPATTERNS
# ============================================================

urlpatterns = [

    # ========================================================
    # PUBLIC / USER (UNCHANGED)
    # ========================================================
    path("home/", home, name="home"),
    path("login/", LoginView.as_view()),
    path("user/me/", UserProfileView.as_view(), name="current_user"),
    path('user/profile/', UserProfileView.as_view(), name='user-profile'),
    path('user/change-pass/', ChangePasswordView.as_view(), name='change-pass'),
    path("packages/<int:pk>/", PackageDetailView.as_view(), name="package-detail"),
    path("packages/", TourPackageViewSet.as_view({"get": "list"}), name="package-list"),
    path("booking/book/", BookingCreateView.as_view(), name="booking-create"),
    path(
        "booking/my/",
        UserBookingViewSet.as_view({"get": "list", "patch": "partial_update"}),
        name="user-bookings",
    ),
    path(
        "booking/my/<int:pk>/",
        UserBookingViewSet.as_view({"get": "retrieve", "patch": "partial_update"}),
        name="user-booking-detail",
    ),
    path('site-info/', SiteConfigDetailView.as_view(), name='site-info'),
    path('faqs/', FAQListView.as_view(), name='faq-list'),
    path("booking/review/", ReviewCreateView.as_view(), name="review-create"),
    path("booking/review/<int:pk>/", ReviewUpdateView.as_view(), name="review-update"),
    path("verify-email/", VerifyEmailView.as_view()),
    path("forgot-password/", ForgotPasswordView.as_view()),
    path("reset-password/", ResetPasswordView.as_view()),
    path("information/", InformationListView.as_view(), name="information-list"),

    
    path("reviews/", ReviewListView.as_view()),

    path("reviews/<int:id>/", ReviewDetailView.as_view()),

    path("reviews/package/<int:package_id>/",
         PackageReviewListView.as_view()),

    path("reviews/guide/<int:guide_id>/",
         GuideReviewListView.as_view()),

    path("reviews/booking/<int:booking_id>/",
         BookingReviewListView.as_view()),

    path("reviews/my/",
         MyReviewListView.as_view()),
    # ========================================================
    # ADMIN AUTH & DASHBOARD
    # ========================================================
    path("site_admin/dashboard-summary/", dashboard_summary),
    path("site_admin/token/", AdminTokenObtainPairView.as_view(), name="admin_token"),
    path("site_admin/token/refresh/", AdminTokenRefreshView.as_view(), name="admin_refresh"),
    path("site_admin/all-data/", AdminAllDataView.as_view(), name="admin-all-data"),

    # ========================================================
    # USERS & GUESTS
    # ========================================================
    path("site_admin/users/", AdminUserListCreateView.as_view(), name="admin-users"),
    path("site_admin/users/<int:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
    path("site_admin/guests/", AdminGuestListCreateView.as_view(), name="admin-guests"),
    path("site_admin/guests/<int:pk>/", AdminGuestDetailView.as_view(), name="admin-guest-detail"),

    # ========================================================
    # BOOKINGS
    # ========================================================
    path("site_admin/bookings/", AdminBookingListCreateView.as_view(), name="admin-bookings"),
    path("site_admin/bookings/<int:pk>/", AdminBookingDetailView.as_view(), name="admin-booking-detail"),

    # ========================================================
    # TOUR PACKAGES & EVENTS
    # ========================================================
    path("site_admin/packages/", AdminTourPackageListCreateView.as_view(), name="admin-packages"),
    path("site_admin/packages/<int:pk>/", AdminTourPackageDetailView.as_view(), name="admin-package-detail"),
    path("site_admin/events/", AdminTourEventListCreateView.as_view(), name="admin-events"),
    path("site_admin/events/<int:pk>/", AdminTourEventDetailView.as_view(), name="admin-event-detail"),
    
    # Itineraries
    path("site_admin/itineraries/", AdminTourEventItineraryListCreateView.as_view(), name="admin-itineraries"),
    path("site_admin/itineraries/<int:pk>/", AdminTourEventItineraryDetailView.as_view(), name="admin-itinerary-detail"),

    # ========================================================
    # QR CODES
    # ========================================================
    path("site_admin/qrcodes/", AdminQRCodeListView.as_view(), name="admin-qrcodes"),
    path("site_admin/qrcodes/<int:pk>/", AdminQRCodeDetailView.as_view(), name="admin-qrcode-detail"),
    path("site_admin/qrcodes/<int:pk>/delete/", AdminQRCodeDeleteView.as_view(), name="admin-qrcode-delete"),

    # ========================================================
    # COMPLIANCE (PERMITS / QUALIFICATIONS)
    # ========================================================
    path("site_admin/permits/<int:pk>/", AdminPermitView.as_view(), name="admin-permit-detail"),
    path("site_admin/permit-templates/<int:pk>/", AdminPermitTemplateView.as_view(), name="admin-permit-template-detail"),
    path("site_admin/qualifications/", AdminQualificationListCreateView.as_view(), name="admin-qualifications"),
    path("site_admin/qualifications/<int:pk>/", AdminQualificationDetailView.as_view(), name="admin-qualification-detail"),
    path("site_admin/permit-types/", AdminPermitTypeListCreateView.as_view(), name="admin-permit-types"),
    path("site_admin/permit-types/<int:pk>/", AdminPermitTypeDetailView.as_view(), name="admin-permit-type-detail"),

    # ========================================================
    # LOGS, REPORTS & NOTIFICATIONS
    # ========================================================
    path("site_admin/reports/<int:pk>/", AdminReportView.as_view(), name="admin-report-detail"),
    path("site_admin/notifications/", AdminNotificationListView.as_view(), name="admin-notifications"),
    path("site_admin/notifications/<int:pk>/", AdminNotificationDetailView.as_view(), name="admin-notification-detail"),
    path("site_admin/notifications/<int:pk>/mark-read/", AdminNotificationMarkReadView.as_view(), name="admin-notification-mark-read"),
    path("site_admin/audit-logs/", AdminAuditLogListView.as_view(), name="admin-audit-logs"),
    path("site_admin/audit-logs/<int:pk>/", AdminAuditLogDetailView.as_view(), name="admin-audit-log-detail"),

    # ========================================================
    # STATIONS & CHECKS
    # ========================================================
    path("site_admin/stations/", AdminStationListCreateView.as_view(), name="admin-stations"),
    path("site_admin/stations/<int:pk>/", AdminStationDetailView.as_view(), name="admin-station-detail"),
    path("site_admin/event-station-checks/", AdminEventStationCheckListView.as_view(), name="admin-event-station-checks"),
    path("site_admin/event-station-checks/<int:pk>/", AdminEventStationCheckDetailView.as_view(), name="admin-event-station-check-detail"),

    # ========================================================
    # REVIEWS & CMS
    # ========================================================
    path("site_admin/reviews/", AdminReviewListView.as_view(), name="admin-reviews"),
    path("site_admin/reviews/<int:pk>/", AdminReviewDetailView.as_view(), name="admin-review-detail"),
    path("site_admin/faqs/", AdminFAQListCreateView.as_view(), name="admin-faqs-list"),
    path("site_admin/faqs/<int:pk>/", AdminFAQDetailView.as_view(), name="admin-faq-detail"),
    path("site_admin/information/", AdminInformationListCreateView.as_view(), name="admin-information-list"),
    path("site_admin/information/<int:pk>/", AdminInformationDetailView.as_view(), name="admin-information-detail"),
    path("site_admin/system-settings/<int:pk>/", AdminSystemSettingView.as_view(), name="admin-system-setting"),
    path("site_admin/site-configuration/<int:pk>/", AdminSiteConfigurationView.as_view(), name="admin-site-config"),
       
path('reports/', AdminReportListCreateView.as_view(), name='admin-report-list'),
path('reports/<int:pk>/', AdminReportDetailView.as_view(), name='admin-report-detail'),
    # Router URLs
    path("", include(router.urls)),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)