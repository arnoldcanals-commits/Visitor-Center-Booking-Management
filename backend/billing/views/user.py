# views.py
from rest_framework import generics, permissions
from rest_framework.response import Response
from django.http import Http404
from ..models import Bill
from ..serializers import UserBillPdfSerializer, UserBillProofSerializer
from rest_framework.parsers import MultiPartParser, FormParser


class UserBillPdfView(generics.RetrieveAPIView):
    """
    Retrieve the PDF of a bill for the authenticated user based on Booking ID.
    """
    serializer_class = UserBillPdfSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        booking_id = self.kwargs.get("booking_id")
        try:
            # Only return bills for bookings that belong to this user
            return Bill.objects.get(booking_id=booking_id, booking__tourist=self.request.user)
        except Bill.DoesNotExist:
            raise Http404


class UserBillProofUploadView(generics.UpdateAPIView):
    """
    Upload payment proof for a bill, only if the bill is issued.
    """
    serializer_class = UserBillProofSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self):
        booking_id = self.kwargs.get("booking_id")
        try:
            # Only allow uploading proof for bills of the authenticated user
            return Bill.objects.get(booking_id=booking_id, booking__tourist=self.request.user)
        except Bill.DoesNotExist:
            raise Http404
