from django.contrib import admin
from django.urls import path, re_path, include
from api.views.auth_views import RegisterView
from api.views import *
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from billing.views import UserBillPdfView, UserBillProofUploadView
   
from rest_framework.routers import DefaultRouter
from billing.views import FeeTypeViewSet, BillItemViewSet

router = DefaultRouter()

router.register(r"fee-types", FeeTypeViewSet, basename="fee-types")
router.register(r"bill-items", BillItemViewSet, basename="bill-items")

urlpatterns = [
    path('api/admin/', admin.site.urls),
    path("api/user/register/", RegisterView.as_view(), name="register"),
    path("api/token/", TokenObtainPairView.as_view(), name="get_token"),
    path("api/", include(router.urls)),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("api-auth/", include("rest_framework.urls")),
    path("api/", include("billing.urls")),  # <--- include the admin.py routes
    path('api/user/bills/<int:booking_id>/', UserBillPdfView.as_view(), name='user-bill-pdf'),
    path(
        "api/user/bills/<int:booking_id>/submit-proof/",
        UserBillProofUploadView.as_view(),
        name="user-bill-submit-proof",
    ),

    path("api/", include("api.urls.urls")),
    path("api/", include("api.urls.booking_staff_urls")),
    path("api/staff/", include("api.urls.staff_auth_urls")),
    path("api/station/", include("api.urls.station_urls")),
    path("api/guide/", include("api.urls.guide_urls")),
    path("api/", include("api.urls.guest_urls")),
    path("api/", include("transport.urls")),
]+ static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)



