from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from rest_framework import serializers
from ..models import (
    User,
    Booking,
    Guest,
    TourPackage,
    TourPackageImage,
    TourEvent,
    TourEventItinerary,
    QRCode,
    Permit,
    PermitTemplate,
    Report,
    Notification,
    AuditLog,
    Qualification,
    PermitType,
    Station,
    Review,
    EventStationCheck,
    EventStationGuestCheck,
    EventStationGuideCheck,
    EventStation,
    FAQ,
    Information,
    SiteConfiguration,
    SystemSetting
)
from billing.models import Bill, BillItem, FeeType, BillTemplate

# ============================================================
# 🔹 BASE ADMIN SERIALIZER
# ============================================================

class AdminBaseSerializer(serializers.ModelSerializer):
    """
    Base serializer that exposes all model fields
    including BaseModel fields.
    """
    class Meta:
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "deleted_at",
        ]


# ============================================================
# 🔹 ADMIN TOKEN
# ============================================================

class AdminTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        user = authenticate(email=email, password=password)

        if not user:
            raise serializers.ValidationError("Invalid credentials.")
        if user.role != "admin":
            raise serializers.ValidationError("Only admin users can log in.")

        return super().validate(attrs)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["is_admin"] = (user.role == "admin")
        return token


# ============================================================
# 🔹 USER
# ============================================================

class AdminUserSerializer(AdminBaseSerializer):
    qualifications = serializers.StringRelatedField(many=True, read_only=True)

    class Meta(AdminBaseSerializer.Meta):
        model = User
        read_only_fields = AdminBaseSerializer.Meta.read_only_fields + [
            "password",
            "last_login",
            "is_superuser",
            "is_staff",
        ]


# ============================================================
# 🔹 GUEST
# ============================================================

class AdminGuestSerializer(AdminBaseSerializer):
    id_document_url = serializers.SerializerMethodField()

    class Meta(AdminBaseSerializer.Meta):
        model = Guest

    def get_id_document_url(self, obj):
        request = self.context.get("request")
        if obj.id_document:
            return request.build_absolute_uri(obj.id_document.url) if request else obj.id_document.url
        return None


# ============================================================
# 🔹 BOOKING
# ============================================================

class AdminBookingSerializer(AdminBaseSerializer):
    tourist_name = serializers.CharField(source="tourist.username", read_only=True)
    package_name = serializers.CharField(source="package.name", read_only=True)
    event_name = serializers.CharField(source="event.package.name", read_only=True)
    assigned_guide_name = serializers.CharField(source="assigned_guide.username", read_only=True)
    itinerary_id = serializers.IntegerField(source="itinerary.id", read_only=True)
    bill_reference=serializers.CharField(source="bill.reference_no",read_only=True)
    guests = serializers.SerializerMethodField()

    class Meta(AdminBaseSerializer.Meta):
        model = Booking
        read_only_fields = AdminBaseSerializer.Meta.read_only_fields + [
            "assigned_guide",
            "itinerary",
            "bill_reference",
        ]

    def get_guests(self, obj):
        return [
            AdminGuestSerializer(bg.guest, context=self.context).data
            for bg in obj.booking_guests.select_related("guest")
        ]


# ============================================================
# 🔹 QR CODE (FIXED)
# ============================================================

class AdminQRCodeSerializer(AdminBaseSerializer):
    guest_name = serializers.CharField(
        source="booking_guest.guest.full_name",
        read_only=True
    )
    booking_id = serializers.IntegerField(
        source="booking_guest.booking.id",
        read_only=True
    )

    class Meta(AdminBaseSerializer.Meta):
        model = QRCode
        read_only_fields = AdminBaseSerializer.Meta.read_only_fields + [
            "code",
        ]


# ============================================================
# 🔹 TOUR PACKAGE
# ============================================================

class AdminTourPackageImageSerializer(AdminBaseSerializer):
    class Meta(AdminBaseSerializer.Meta):
        model = TourPackageImage


class AdminTourPackageSerializer(AdminBaseSerializer):
    images = AdminTourPackageImageSerializer(many=True, required=False)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )

    class Meta(AdminBaseSerializer.Meta):
        model = TourPackage

    def create(self, validated_data):
        uploaded_images = validated_data.pop("uploaded_images", [])
        package = super().create(validated_data)

        for image in uploaded_images:
            TourPackageImage.objects.create(package=package, image=image)

        return package

    def update(self, instance, validated_data):
        uploaded_images = validated_data.pop("uploaded_images", [])
        instance = super().update(instance, validated_data)

        for image in uploaded_images:
            TourPackageImage.objects.create(package=instance, image=image)

        return instance

class AdminEventStationSerializer(AdminBaseSerializer):
    station_name = serializers.CharField(source="station.name", read_only=True)

    class Meta(AdminBaseSerializer.Meta):
        model = EventStation
        fields = ["id", "station", "station_name", "order", "station_name"]

# ============================================================
# 🔹 TOUR EVENT
# ============================================================

class AdminTourEventSerializer(AdminBaseSerializer):

    package_name = serializers.CharField(
        source="package.name",
        read_only=True
    )

    assigned_guide_name = serializers.CharField(
        source="assigned_guide.username",
        read_only=True
    )

    slots_used = serializers.ReadOnlyField()
    slots_available = serializers.ReadOnlyField()
    is_full = serializers.ReadOnlyField()

    event_stations = AdminEventStationSerializer(
       
        many=True,
        required=False
    )

    class Meta(AdminBaseSerializer.Meta):
        model = TourEvent
        fields = "__all__"

    def create(self, validated_data):

        event_stations_data = validated_data.pop("event_stations", [])

        event = TourEvent.objects.create(**validated_data)

        EventStation.objects.bulk_create([
            EventStation(
                event=event,
                station=station_data["station"],
                order=station_data["order"]
            )
            for station_data in event_stations_data
        ])

        return event

    def update(self, instance, validated_data):

        event_stations_data = validated_data.pop("event_stations", None)

        instance = super().update(instance, validated_data)

        if event_stations_data is not None:

            instance.event_stations.all().delete()

            EventStation.objects.bulk_create([
                EventStation(
                    event=instance,
                    station=station_data["station"],
                    order=station_data["order"]
                )
                for station_data in event_stations_data
            ])

        return instance


# ============================================================
# 🔹 PERMIT
# ============================================================

class AdminPermitSerializer(AdminBaseSerializer):
    class Meta(AdminBaseSerializer.Meta):
        model = Permit


class AdminPermitTemplateSerializer(AdminBaseSerializer):
    class Meta(AdminBaseSerializer.Meta):
        model = PermitTemplate


# ============================================================
# 🔹 REPORT
# ============================================================

class AdminReportSerializer(AdminBaseSerializer):
    class Meta(AdminBaseSerializer.Meta):
        model = Report


# ============================================================
# 🔹 NOTIFICATION
# ============================================================

class AdminNotificationSerializer(AdminBaseSerializer):
    class Meta(AdminBaseSerializer.Meta):
        model = Notification
        read_only_fields = AdminBaseSerializer.Meta.read_only_fields + [
            "read_at"
        ]


# ============================================================
# 🔹 AUDIT LOG (FULLY READ ONLY)
# ============================================================

class AdminAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = "__all__"
        read_only_fields = ["__all__"]


# ============================================================
# 🔹 QUALIFICATION / PERMIT TYPE
# ============================================================

class AdminQualificationSerializer(AdminBaseSerializer):
    class Meta(AdminBaseSerializer.Meta):
        model = Qualification


class AdminPermitTypeSerializer(AdminBaseSerializer):
    class Meta(AdminBaseSerializer.Meta):
        model = PermitType


# ============================================================
# 🔹 STATION
# ============================================================

class AdminStationSerializer(AdminBaseSerializer):
    staff_names = serializers.SerializerMethodField()

    class Meta(AdminBaseSerializer.Meta):
        model = Station

    def get_staff_names(self, obj):
        return [user.username for user in obj.staff.all()]


# ============================================================
# 🔹 ITINERARY
# ============================================================

class AdminTourEventItinerarySerializer(AdminBaseSerializer):

    file_url = serializers.SerializerMethodField()

    class Meta(AdminBaseSerializer.Meta):
        model = TourEventItinerary

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file:
            return request.build_absolute_uri(obj.file.url)
        return None



# ============================================================
# 🔹 REVIEW
# ============================================================

class AdminReviewSerializer(AdminBaseSerializer):
    reviewer_name = serializers.CharField(source="reviewer.username", read_only=True)
    reviewer_email = serializers.EmailField(source="reviewer.email", read_only=True)
    reviewer_avatar = serializers.ImageField(source="reviewer.profile_picture", read_only=True)
    
    package_name = serializers.CharField(source="package.name", read_only=True)
    guide_name = serializers.CharField(source="tour_guide.username", read_only=True)
    guide_email = serializers.EmailField(source="tour_guide.email", read_only=True)
    guide_avatar = serializers.ImageField(source="tour_guide.profile_picture", read_only=True)
    class Meta(AdminBaseSerializer.Meta):
        model = Review


# ============================================================
# 🔹 EVENT STATION CHECKS
# ============================================================

class AdminEventStationGuestCheckSerializer(AdminBaseSerializer):
    # Pull data from the linked Guest model via BookingGuest
    full_name = serializers.ReadOnlyField(source='booking_guest.guest.full_name')
    age = serializers.ReadOnlyField(source='booking_guest.guest.age')
    gender = serializers.ReadOnlyField(source='booking_guest.guest.gender')
    is_local = serializers.ReadOnlyField(source='booking_guest.guest.local')
    guest_id = serializers.ReadOnlyField(source='booking_guest.guest.id')
    assigned_guide_name = serializers.CharField(
    source="assigned_guide.username",
    read_only=True
)

    # Identify which event this check belongs to
    event_id = serializers.ReadOnlyField(source='event_station_check.event.id')
    station_name = serializers.ReadOnlyField(source='event_station_check.station.name')
    checked_by = serializers.CharField( read_only=True)
    station_ids = serializers.PrimaryKeyRelatedField(
    many=True,
    queryset=Station.objects.all(),
    write_only=True,
    required=False
)

    class Meta(AdminBaseSerializer.Meta):
        model = EventStationGuestCheck
        fields = [
            'id', 'guest_id', 'full_name', 'age', 'gender', 'is_local',
            'checked', 'checked_at', 'checked_latitude', 'checked_longitude',
            'event_id', 'station_name', 'event_station_check', 'checked_by', "station_ids", "assigned_guide_name"
        ]


class AdminEventStationGuideCheckSerializer(AdminBaseSerializer):
    class Meta(AdminBaseSerializer.Meta):
        model = EventStationGuideCheck


class AdminEventStationCheckSerializer(AdminBaseSerializer):
    guest_checks = AdminEventStationGuestCheckSerializer(many=True, read_only=True)
    guide_check = AdminEventStationGuideCheckSerializer(read_only=True)

    class Meta(AdminBaseSerializer.Meta):
        model = EventStationCheck
        read_only_fields = AdminBaseSerializer.Meta.read_only_fields + [
            "guest_checks",
            "guide_check",
        ]


# ============================================================
# 🔹 SYSTEM SETTINGS / SITE / FAQ / INFO
# ============================================================

class AdminSystemSettingSerializer(AdminBaseSerializer):
    class Meta(AdminBaseSerializer.Meta):
        model = SystemSetting


class AdminSiteConfigurationSerializer(AdminBaseSerializer):
    class Meta(AdminBaseSerializer.Meta):
        model = SiteConfiguration


class AdminFAQSerializer(AdminBaseSerializer):
    class Meta(AdminBaseSerializer.Meta):
        model = FAQ


class AdminInformationSerializer(AdminBaseSerializer):
    class Meta(AdminBaseSerializer.Meta):
        model = Information
