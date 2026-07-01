from rest_framework import serializers
from django.db.models import Avg
from ..models import (
    TourPackage,
    TourPackageImage,
    TourEvent,
    Review,

)

# =====================================================
# EXISTING SERIALIZERS (UNCHANGED)
# =====================================================

class TourPackageImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    def get_image(self, obj):
        try:
            return obj.image.url  # always relative
        except:
            return None

    class Meta:
        model = TourPackageImage
        fields = ['id', 'image', 'package']


class TourPackageSerializer(serializers.ModelSerializer):
    images = TourPackageImageSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()
    class Meta:
        model = TourPackage
        fields = ['id', 'name', 'description', 'base_price', 'images','short_description', "digest","average_rating"]

    def get_average_rating(self, obj):
        avg = (
            Review.objects
            .filter(package=obj, target_type="package")
            .aggregate(avg=Avg("rating"))
        )["avg"]

        return round(avg, 2) if avg else 0

# =====================================================
# NEW – PACKAGE DETAIL (READ-ONLY, SAFE NAMES)
# =====================================================

class PackageDetailImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    def get_image(self, obj):
        try:
            return obj.image.url
        except:
            return None

    class Meta:
        model = TourPackageImage
        fields = ['id', 'image']


class PackageEventPreviewSerializer(serializers.ModelSerializer):
    slots_available = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)

    class Meta:
        model = TourEvent
        fields = [
            'id',
            'start_date',
            'end_date',
            'slot_limit',
            'slots_used',
            'slots_available',
            'is_full',
            'is_group_event',
            'requires_permit',
        ]




class PackageDetailSerializer(serializers.ModelSerializer):
    images = PackageDetailImageSerializer(many=True, read_only=True)
    events = PackageEventPreviewSerializer(many=True, read_only=True)
    guide_reviews = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    booking_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = TourPackage
        fields = [
            'id', 'name', 'short_description', 'description', 'base_price', 'requires_permit',
            'created_at', 'images', 'events', 'booking_count', 'average_rating', 'guide_reviews','digest',
        ]
    
    def get_average_rating(self, obj):
        avg = (
            Review.objects
            .filter(package=obj, target_type="package")
            .aggregate(avg=Avg("rating"))
        )["avg"]

        return round(avg, 2) if avg else 0
    
    def get_guide_reviews(self,obj):
      return  0
    
