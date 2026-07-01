# billing/views/admin.py
from rest_framework import generics
from rest_framework.permissions import IsAdminUser

from billing.models import (
    BillTemplate,
    FeeType,
    Bill,
    BillItem,
)
from billing.serializers.admin import (
    AdminBillTemplateSerializer,
    AdminFeeTypeSerializer,
    AdminBillSerializer,
    AdminBillItemSerializer,
)


# =====================================================
# BASE MIXIN
# =====================================================
class AdminRequestMixin:
    def get_serializer_context(self):
        return {"request": self.request}


# =====================================================
# BILL TEMPLATES
# =====================================================
class AdminBillTemplateListCreateView(AdminRequestMixin, generics.ListCreateAPIView):
    queryset = BillTemplate.objects.all()
    serializer_class = AdminBillTemplateSerializer
    permission_classes = [IsAdminUser]


class AdminBillTemplateDetailView(AdminRequestMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = BillTemplate.objects.all()
    serializer_class = AdminBillTemplateSerializer
    permission_classes = [IsAdminUser]


# =====================================================
# FEE TYPES
# =====================================================
class AdminFeeTypeListCreateView(AdminRequestMixin, generics.ListCreateAPIView):
    queryset = FeeType.objects.all()
    serializer_class = AdminFeeTypeSerializer
    permission_classes = [IsAdminUser]


class AdminFeeTypeDetailView(AdminRequestMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = FeeType.objects.all()
    serializer_class = AdminFeeTypeSerializer
    permission_classes = [IsAdminUser]


# =====================================================
# BILLS
# =====================================================
class AdminBillListView(AdminRequestMixin, generics.ListAPIView):
    queryset = Bill.objects.select_related("booking", "template").prefetch_related("items")
    serializer_class = AdminBillSerializer
    permission_classes = [IsAdminUser]


class AdminBillDetailView(AdminRequestMixin, generics.RetrieveAPIView):
    queryset = Bill.objects.select_related("booking", "template").prefetch_related("items")
    serializer_class = AdminBillSerializer
    permission_classes = [IsAdminUser]


class AdminBillUpdateView(AdminRequestMixin, generics.UpdateAPIView):
    queryset = Bill.objects.all()
    serializer_class = AdminBillSerializer
    permission_classes = [IsAdminUser]

    def perform_update(self, serializer):
        serializer.save(
            template=serializer.validated_data.get("template"),
            transaction_number=serializer.validated_data.get("transaction_number"),
            transaction_image=serializer.validated_data.get("transaction_image"),
        )



# =====================================================
# BILL ITEMS
# =====================================================
class AdminBillItemListCreateView(AdminRequestMixin, generics.ListCreateAPIView):
    queryset = BillItem.objects.select_related("bill", "guest", "fee_type")
    serializer_class = AdminBillItemSerializer
    permission_classes = [IsAdminUser]


class AdminBillItemDetailView(AdminRequestMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = BillItem.objects.select_related("bill", "guest", "fee_type")
    serializer_class = AdminBillItemSerializer
    permission_classes = [IsAdminUser]
