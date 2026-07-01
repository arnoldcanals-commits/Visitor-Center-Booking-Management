# serializers/review_serializers.py

from rest_framework import serializers
from ..models import Review, TourPackage, User


# ============================================
# Package serializer (review target)
# ============================================

class ReviewTourPackageSerializer(serializers.ModelSerializer):

    class Meta:
        model = TourPackage
        fields = [
            "id",
            "name",
            "short_description",

            # status visibility
            "is_active",
            "is_archived",
        ]
        read_only_fields = fields


# ============================================
# Guide serializer (review target)
# ============================================

class ReviewTourGuideSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            "id",

            # identity
            "username",

            # profile picture for UI display
            "profile_picture",

            # status visibility (important)
            "is_active",
            "is_archived",
        ]
        read_only_fields = fields


# ============================================
# Reviewer serializer (who wrote review)
# ============================================

class ReviewReviewerSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "profile_picture",

            # optional but recommended for compliance transparency
            "is_active",
        ]
        read_only_fields = fields


# ============================================
# Main Review Serializer (USER READ-ONLY)
# ============================================

class ReviewReadOnlySerializer(serializers.ModelSerializer):

    reviewer = ReviewReviewerSerializer(read_only=True)

    # reviewed entities
    package = ReviewTourPackageSerializer(read_only=True)
    tour_guide = ReviewTourGuideSerializer(read_only=True)

    # safe booking reference
    booking_id = serializers.IntegerField(
        source="booking.id",
        read_only=True
    )

    class Meta:
        model = Review

        fields = [

            # identity
            "id",

            # review visibility state
            "is_active",
            "is_archived",

            # reference
            "booking_id",

            # reviewer
            "reviewer",

            # target info
            "target_type",
            "package",
            "tour_guide",

            # review content
            "rating",
            "comment",

            # timestamps
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields
