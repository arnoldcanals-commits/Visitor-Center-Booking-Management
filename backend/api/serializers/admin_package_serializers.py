from django.db import transaction
from rest_framework import serializers

from ..models import TourPackage, TourPackageImage


class TourPackageImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TourPackageImage
        fields = ["id", "package", "image", "is_main"]
        read_only_fields = ["id", "package", "image"]


class TourPackageListSerializer(serializers.ModelSerializer):
    """
    Lightweight: used for the paginated list. No `description` (can be large rich text)
    and only the main image instead of the whole gallery.

    The view must prefetch main images into `main_images` and annotate `image_count`
    (see TourPackageViewSet.get_queryset).
    """

    main_image = serializers.SerializerMethodField()
    image_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = TourPackage
        fields = [
            "id", "name", "short_description", "digest", "base_price",
            "requires_permit", "is_active", "is_archived", "created_at",
            "main_image", "image_count",
        ]
        read_only_fields = fields

    def get_main_image(self, obj):
        mains = getattr(obj, "main_images", None)
        if not mains:
            return None
        return TourPackageImageSerializer(mains[0], context=self.context).data


class TourPackageSerializer(serializers.ModelSerializer):
    """Full serializer: retrieve / create / update. Includes the whole gallery."""

    images = TourPackageImageSerializer(many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = TourPackage
        fields = [
            "id", "name", "short_description", "digest", "description",
            "base_price", "requires_permit", "is_active", "is_archived",
            "created_at", "images", "uploaded_images",
        ]
        read_only_fields = ["id", "created_at", "images"]

    def _add_images(self, package, files):
        if not files:
            return
        has_main = package.images.filter(is_main=True).exists()
        TourPackageImage.objects.bulk_create(
            [
                TourPackageImage(
                    package=package,
                    image=f,
                    # first upload becomes the cover if the package has none yet
                    is_main=(not has_main and i == 0),
                )
                for i, f in enumerate(files)
            ]
        )

    @transaction.atomic
    def create(self, validated_data):
        files = validated_data.pop("uploaded_images", [])
        package = super().create(validated_data)
        self._add_images(package, files)
        return package

    @transaction.atomic
    def update(self, instance, validated_data):
        files = validated_data.pop("uploaded_images", [])
        package = super().update(instance, validated_data)
        self._add_images(package, files)
        return package

from django.db import transaction
from rest_framework import serializers

from ..models import Activity, TourPackage, TourPackageImage


class TourPackageImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TourPackageImage
        fields = ["id", "package", "image", "is_main"]
        read_only_fields = ["id", "package", "image"]


class TourPackageListSerializer(serializers.ModelSerializer):
    """
    Lightweight: used for the paginated list. No `description` (can be large rich text)
    and only the main image instead of the whole gallery.

    The view must prefetch main images into `main_images` and annotate `image_count`
    (see TourPackageViewSet.get_queryset).
    """

    main_image = serializers.SerializerMethodField()
    image_count = serializers.IntegerField(read_only=True, default=0)
    activity_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = TourPackage
        fields = [
            "id", "name", "short_description", "digest", "base_price",
            "requires_permit", "is_active", "is_archived", "created_at",
            "main_image", "image_count", "activity_count",
        ]
        read_only_fields = fields

    def get_main_image(self, obj):
        mains = getattr(obj, "main_images", None)
        if not mains:
            return None
        return TourPackageImageSerializer(mains[0], context=self.context).data


class TourPackageSerializer(serializers.ModelSerializer):
    """Full serializer: retrieve / create / update. Includes the whole gallery."""

    images = TourPackageImageSerializer(many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = TourPackage
        fields = [
            "id", "name", "short_description", "digest", "description",
            "base_price", "requires_permit", "is_active", "is_archived",
            "created_at", "images", "uploaded_images",
        ]
        read_only_fields = ["id", "created_at", "images"]

    def _add_images(self, package, files):
        if not files:
            return
        has_main = package.images.filter(is_main=True).exists()
        TourPackageImage.objects.bulk_create(
            [
                TourPackageImage(
                    package=package,
                    image=f,
                    # first upload becomes the cover if the package has none yet
                    is_main=(not has_main and i == 0),
                )
                for i, f in enumerate(files)
            ]
        )

    @transaction.atomic
    def create(self, validated_data):
        files = validated_data.pop("uploaded_images", [])
        package = super().create(validated_data)
        self._add_images(package, files)
        return package

    @transaction.atomic
    def update(self, instance, validated_data):
        files = validated_data.pop("uploaded_images", [])
        package = super().update(instance, validated_data)
        self._add_images(package, files)
        return package


class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = ["id", "package", "name", "description", "extra_price", "is_active"]
        read_only_fields = ["id"]