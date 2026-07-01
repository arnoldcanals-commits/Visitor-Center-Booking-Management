from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework import status

from billing.models import Bill
from billing.serializers.admin import AdminBillSerializer


# =====================================================
# BASE ACTION VIEW
# =====================================================
class AdminBillActionBase(APIView):
    permission_classes = [IsAdminUser]

    def get_bill(self, pk):
        try:
            return Bill.objects.get(pk=pk)
        except Bill.DoesNotExist:
            return None

    def respond(self, bill, request):
        serializer = AdminBillSerializer(bill, context={"request": request})
        return Response(serializer.data)


class AdminBillIssueView(AdminBillActionBase):
    def post(self, request, pk):
        bill = self.get_bill(pk)
        if not bill:
            return Response({"detail": "Bill not found"}, status=404)

        try:
            bill.issue()
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)

        return self.respond(bill, request)


from billing.serializers.actions import BillMarkPaidSerializer

class AdminBillMarkPaidView(AdminBillActionBase):
    def post(self, request, pk):
        bill = self.get_bill(pk)
        if not bill:
            return Response({"detail": "Bill not found"}, status=404)

        serializer = BillMarkPaidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # attach optional payment metadata
        if serializer.validated_data.get("transaction_number"):
            bill.transaction_number = serializer.validated_data["transaction_number"]

        if serializer.validated_data.get("transaction_image"):
            bill.transaction_image = serializer.validated_data["transaction_image"]

        try:
            bill.mark_paid()
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)

        return self.respond(bill, request)


class AdminBillVerifyView(AdminBillActionBase):
    def post(self, request, pk):
        bill = self.get_bill(pk)
        if not bill:
            return Response({"detail": "Bill not found"}, status=404)

        try:
            bill.verify()
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

        return self.respond(bill, request)

class AdminBillRejectView(AdminBillActionBase):
    def post(self, request, pk):
        bill = self.get_bill(pk)
        if not bill:
            return Response({"detail": "Bill not found"}, status=404)

        try:
            bill.reject()
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

        return self.respond(bill, request)
