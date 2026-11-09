from django.db import transaction
from django.db.models import Count, Prefetch
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from ..models import Activity, TourPackage, TourPackageImage
from ..serializers import (
    ActivitySerializer,
    TourPackageImageSerializer,
    TourPackageListSerializer,
    TourPackageSerializer,
)


class AdminTourPackagePagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 60


def _to_bool(value):
    if value is None:
        return None
    return str(value).lower() in ("1", "true", "yes")


class AdminTourPackageViewSet(viewsets.ModelViewSet):
    """
    GET    /packages/?page=1&search=foo&is_archived=false&is_active=true&ordering=-created_at
    GET    /packages/<id>/          full package (description + all images)
    POST   /packages/               multipart, accepts repeated `uploaded_images`
    PATCH  /packages/<id>/          partial update (also used for publish / archive toggles)
    DELETE /packages/<id>/
    """

    queryset = TourPackage.objects.all()  # lets routers infer the basename; get_queryset() does the real work
    permission_classes = [IsAdminUser]  # swap for your own admin permission
    pagination_class = AdminTourPackagePagination
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "digest", "short_description"]
    ordering_fields = ["created_at", "name", "base_price"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return TourPackageListSerializer
        return TourPackageSerializer

    def get_queryset(self):
        qs = TourPackage.objects.all()

        if self.action == "list":
            qs = qs.annotate(
                image_count=Count("images", distinct=True),
                activity_count=Count("activities", distinct=True),
            ).prefetch_related(
                Prefetch(
                    "images",
                    # main first, then oldest, so packages with no is_main still get a thumbnail
                    queryset=TourPackageImage.objects.order_by("-is_main", "created_at"),
                    to_attr="main_images",
                )
            )
        else:
            qs = qs.prefetch_related("images")

        params = self.request.query_params
        is_archived = _to_bool(params.get("is_archived"))
        is_active = _to_bool(params.get("is_active"))
        if is_archived is not None:
            qs = qs.filter(is_archived=is_archived)
        if is_active is not None:
            qs = qs.filter(is_active=is_active)
        return qs


class AdminTourPackageImageViewSet(mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """
    DELETE /package-images/<id>/
    POST   /package-images/<id>/set-main/
    """

    permission_classes = [IsAdminUser]
    queryset = TourPackageImage.objects.all()
    serializer_class = TourPackageImageSerializer

    @action(detail=True, methods=["post"], url_path="set-main")
    def set_main(self, request, pk=None):
        image = self.get_object()
        # The partial unique constraint means the old main must be cleared *before*
        # the new one is saved, otherwise save() raises IntegrityError.
        with transaction.atomic():
            TourPackageImage.objects.filter(
                package=image.package, is_main=True
            ).exclude(pk=image.pk).update(is_main=False)
            if not image.is_main:
                image.is_main = True
                image.save(update_fields=["is_main"])
        return Response(self.get_serializer(image).data)

    @transaction.atomic
    def perform_destroy(self, instance):
        package_id, was_main = instance.package_id, instance.is_main
        instance.delete()
        # keep a cover image if any images remain
        if was_main:
            next_img = TourPackageImage.objects.filter(package_id=package_id).order_by("created_at").first()
            if next_img:
                next_img.is_main = True
                next_img.save(update_fields=["is_main"])

    def destroy(self, request, *args, **kwargs):
        super().destroy(request, *args, **kwargs)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminActivityViewSet(viewsets.ModelViewSet):
    """
    GET    /activities/?package=<id>    all activities of one package (not paginated)
    POST   /activities/                 {package, name, description, extra_price, is_active}
    PATCH  /activities/<id>/
    DELETE /activities/<id>/
    """

    permission_classes = [IsAdminUser]
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        package_id = self.request.query_params.get("package")
        if package_id:
            qs = qs.filter(package_id=package_id)
        return qs.order_by("created_at")