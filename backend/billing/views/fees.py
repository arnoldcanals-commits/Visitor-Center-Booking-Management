from rest_framework import viewsets, permissions
from ..models import FeeType
from ..serializers import FeeTypeSerializer


class FeeTypeViewSet(viewsets.ModelViewSet):
    queryset = FeeType.objects.all().order_by("-id")
    serializer_class = FeeTypeSerializer
    permission_classes = [permissions.IsAuthenticated]  # adjust if needed

from rest_framework import viewsets, permissions
from ..models import BillItem
from ..serializers import BillItemSerializer


class BillItemViewSet(viewsets.ModelViewSet):
    queryset = BillItem.objects.select_related(
        "bill", "fee_type", "booking_guest"
    ).all().order_by("-id")

    serializer_class = BillItemSerializer
    permission_classes = [permissions.IsAuthenticated]