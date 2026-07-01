# billing/urls/admin.py
from django.urls import path
from billing.views.admin import *
from django.urls import path
from billing.views.admin_actions import (
    AdminBillIssueView,
    AdminBillMarkPaidView,
    AdminBillVerifyView,
    AdminBillRejectView,
)
from rest_framework.routers import DefaultRouter
from .views import FeeTypeViewSet, BillItemViewSet

router = DefaultRouter()

router.register(r"fee-types", FeeTypeViewSet, basename="api/fee-types")
router.register(r"bill-items", BillItemViewSet, basename="api/bill-items")

urlpatterns = router.urls

urlpatterns = [
    # -------------------
    # BILL TEMPLATES
    # -------------------
    path("site_admin/bill-templates/", AdminBillTemplateListCreateView.as_view()),
    path("site_admin/bill-templates/<int:pk>/", AdminBillTemplateDetailView.as_view()),

    # -------------------
    # FEE TYPES
    # -------------------
    path("site_admin/fee-types/", AdminFeeTypeListCreateView.as_view()),
    path("site_admin/fee-types/<int:pk>/", AdminFeeTypeDetailView.as_view()),

    # -------------------
    # BILLS
    # -------------------
    path("site_admin/bills/", AdminBillListView.as_view()),
    path("site_admin/bills/<int:pk>/", AdminBillDetailView.as_view()),
    path("site_admin/bills/<int:pk>/update/", AdminBillUpdateView.as_view()),

    # -------------------
    # BILL ITEMS
    # -------------------
    path("site_admin/bill-items/", AdminBillItemListCreateView.as_view()),
    path("site_admin/bill-items/<int:pk>/", AdminBillItemDetailView.as_view()),

        # -------------------
    # BILL STATUS ACTIONS
    # -------------------
    path("site_admin/bills/<int:pk>/issue/", AdminBillIssueView.as_view()),
    path("site_admin/bills/<int:pk>/mark-paid/", AdminBillMarkPaidView.as_view()),
    path("site_admin/bills/<int:pk>/verify/", AdminBillVerifyView.as_view()),
    path("site_admin/bills/<int:pk>/reject/", AdminBillRejectView.as_view()),

    
]


