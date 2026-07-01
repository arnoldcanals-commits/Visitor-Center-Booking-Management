from rest_framework import generics, permissions
from django.db.models import Q

from ..models import Review
from ..serializers.review_serializers import ReviewReadOnlySerializer


# =====================================================
# Base Query Optimizer
# =====================================================

class ReviewQueryMixin:
    """
    Provides optimized queryset with proper select_related
    to prevent N+1 queries.
    """

    def get_queryset(self):
        return Review.objects.select_related(
            "reviewer",
            "package",
            "tour_guide",
            "booking",
        ).order_by("-created_at")


# =====================================================
# List ALL reviews (public-safe)
# =====================================================

class ReviewListView(ReviewQueryMixin, generics.ListAPIView):
    """
    Returns all reviews.

    Frontend decides whether to hide inactive ones
    using is_active field.
    """

    serializer_class = ReviewReadOnlySerializer
    permission_classes = [permissions.AllowAny]


# =====================================================
# Reviews for a specific package
# =====================================================

class PackageReviewListView(ReviewQueryMixin, generics.ListAPIView):

    serializer_class = ReviewReadOnlySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        package_id = self.kwargs["package_id"]

        return super().get_queryset().filter(
            target_type="package",
            package_id=package_id
        )


# =====================================================
# Reviews for a specific guide
# =====================================================

class GuideReviewListView(ReviewQueryMixin, generics.ListAPIView):

    serializer_class = ReviewReadOnlySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        guide_id = self.kwargs["guide_id"]

        return super().get_queryset().filter(
            target_type="guide",
            tour_guide_id=guide_id
        )


# =====================================================
# Reviews for a specific booking
# (only owner or staff should see)
# =====================================================

class BookingReviewListView(ReviewQueryMixin, generics.ListAPIView):

    serializer_class = ReviewReadOnlySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):

        booking_id = self.kwargs["booking_id"]

        user = self.request.user

        qs = super().get_queryset().filter(
            booking_id=booking_id
        )

        # allow owner or staff only
        if user.is_staff or user.is_superuser:
            return qs

        return qs.filter(reviewer=user)


# =====================================================
# Current user's reviews
# =====================================================

class MyReviewListView(ReviewQueryMixin, generics.ListAPIView):

    serializer_class = ReviewReadOnlySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):

        return super().get_queryset().filter(
            reviewer=self.request.user
        )


# =====================================================
# Single Review Detail
# =====================================================

class ReviewDetailView(ReviewQueryMixin, generics.RetrieveAPIView):

    serializer_class = ReviewReadOnlySerializer
    permission_classes = [permissions.AllowAny]

    lookup_field = "id"
