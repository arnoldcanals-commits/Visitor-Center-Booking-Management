from decimal import Decimal
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from api.models import Guest
from .models import Permit, PermitTemplate
from .serializers import PermitSerializer, CreatePermitSerializer
from .tasks import generate_permit_pdf_task
from rest_framework.pagination import PageNumberPagination

class PermitPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100

PER_GUEST_FEE = Decimal("50.00")  # adjust to your actual pricing

ACTIVE_STATUSES = ["pending_payment", "paid", "generated"]

class CreatePermitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreatePermitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        guest_ids = serializer.validated_data["guest_ids"]

        guests = Guest.objects.filter(id__in=guest_ids, owner=request.user)
        if guests.count() != len(guest_ids):
            return Response({"error": "one or more guests not found or not yours"}, status=400)

        # block duplicates — any guest already on an unresolved permit
        conflicting = Permit.objects.filter(
            guests__id__in=guest_ids,
            status__in=ACTIVE_STATUSES,
        ).distinct()

        if conflicting.exists():
            conflicting_names = set()
            for p in conflicting:
                conflicting_names.update(
                    g.full_name for g in p.guests.all() if g.id in guest_ids
                )
            return Response(
                {
                    "error": "some guests already have an active permit in progress",
                    "conflicting_guests": list(conflicting_names),
                    "existing_permit_ids": list(conflicting.values_list("id", flat=True)),
                },
                status=409,
            )

        active_template = PermitTemplate.objects.filter(is_active=True).first()
        if not active_template:
            return Response({"error": "no active permit template configured"}, status=500)

        permit = Permit.objects.create(
            created_by=request.user,
            template=active_template,
            fee_amount=PER_GUEST_FEE * guests.count(),
        )
        permit.guests.set(guests)

        return Response(PermitSerializer(permit).data, status=status.HTTP_201_CREATED)

class PermitDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        permit = Permit.objects.filter(pk=pk, created_by=request.user).first()
        if not permit:
            return Response({"error": "not found"}, status=404)
        return Response(PermitSerializer(permit).data)


class MarkPermitPaidView(APIView):
    """Called by your payment webhook handler (or manually for now while testing)."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        permit = Permit.objects.filter(pk=pk).first()
        if not permit:
            return Response({"error": "not found"}, status=404)

        permit.status = "paid"
        permit.payment_reference = request.data.get("payment_reference", "")
        permit.paid_at = timezone.now()
        permit.save()

        generate_permit_pdf_task.delay(permit.id)  # kick off PDF generation right after payment

        return Response(PermitSerializer(permit).data)


class MarkPermitSignedView(APIView):
    """Called on-site once the head physically signs (or approves digitally)."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        permit = Permit.objects.filter(pk=pk).first()
        if not permit or permit.status != "generated":
            return Response({"error": "permit not ready to be signed"}, status=400)

        permit.status = "signed"
        permit.signed_at = timezone.now()
        permit.signed_by = request.data.get("signed_by", "")
        permit.save()

        return Response(PermitSerializer(permit).data)

class AdminPermitListView(APIView):
    """Admin dashboard feed — permits waiting on staff action."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        status_filter = request.query_params.get("status")
        qs = Permit.objects.all().order_by("-created_at")
        if status_filter:
            qs = qs.filter(status=status_filter)

        paginator = PermitPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = PermitSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

class MyPermitsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        permits = Permit.objects.filter(created_by=request.user).order_by("-created_at")
        return Response(PermitSerializer(permits, many=True).data)

from .models import PermitTemplate
from .serializers import PermitTemplateSerializer
from rest_framework.parsers import MultiPartParser

class PermitTemplateListCreateView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser]

    def get(self, request):
        templates = PermitTemplate.objects.all().order_by("-created_at")
        return Response(PermitTemplateSerializer(templates, many=True, context={"request": request}).data)

    def post(self, request):
        name = request.data.get("name")
        file = request.data.get("file")
        if not name or not file:
            return Response({"error": "name and file are required"}, status=400)

        template = PermitTemplate.objects.create(name=name, file=file)
        return Response(
            PermitTemplateSerializer(template, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ActivatePermitTemplateView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        template = PermitTemplate.objects.filter(pk=pk).first()
        if not template:
            return Response({"error": "not found"}, status=404)

        PermitTemplate.objects.exclude(pk=pk).update(is_active=False)
        template.is_active = True
        template.save()

        return Response(PermitTemplateSerializer(template, context={"request": request}).data)