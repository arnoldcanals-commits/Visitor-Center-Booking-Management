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
    QRCode,

    Permit,
    PermitTemplate,
    Report,
    Notification,
    AuditLog,
    Qualification,
    PermitType,
    Station,
)

# ============================================================
# Staff TOKEN SERIALIZER
# ============================================================
class StaffTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")
        user = authenticate(email=email, password=password)

        if not user:
            raise serializers.ValidationError("Invalid credentials.")

        if user.role != "Staff":
            raise serializers.ValidationError("Only Staff users can log in.")

        return super().validate(attrs)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["is_Staff"] = (user.role == "Staff")
        return token


# ============================================================
# Staff SERIALIZERS
# ============================================================
class StaffUserSerializer(serializers.ModelSerializer):
    qualifications = serializers.StringRelatedField(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "role",
            "status",
            "phone_number",
            "qualifications",
        ]


class StaffGuestSerializer(serializers.ModelSerializer):
    id_document_url = serializers.SerializerMethodField()

    class Meta:
        model = Guest
        fields = [
            "id",
            "booking",
            "full_name",
            "age",
            "id_number",
            "id_document",
            "id_document_url",
        ]
        read_only_fields = ["id", "id_document_url"]

    def get_id_document_url(self, obj):
        request = self.context.get("request")
        if obj.id_document:
            return request.build_absolute_uri(obj.id_document.url) if request else obj.id_document.url
        return None


class StaffBookingSerializer(serializers.ModelSerializer):
    tourist_name = serializers.CharField(source="tourist.username", read_only=True)
    package_name = serializers.CharField(source="package.name", read_only=True)
    event_name = serializers.CharField(source="event.package.name", read_only=True)
    assigned_guide_name = serializers.CharField(
        source="assigned_guide.username",
        read_only=True
    )
    guests = StaffGuestSerializer(many=True, read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "tourist",
            "tourist_name",
            "package",
            "package_name",
            "event",
            "event_name",
            "check_in",
            "check_out",
            "booking_date",
            "status",
            "assigned_guide",
            "assigned_guide_name",
            "is_archived",
            "created_at",
            "guests",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        package = attrs.get("package")
        event = attrs.get("event")

        if event:
            if package and event.package != package:
                raise serializers.ValidationError(
                    "Selected event does not belong to the selected package."
                )

            if not package:
                attrs["package"] = event.package

            if event.is_full:
                raise serializers.ValidationError("Selected event is already full.")

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request else None

        if not request:
            raise serializers.ValidationError("Request is required.")

        guests_data = []
        i = 0
        while f"guests[{i}][full_name]" in request.data:
            guests_data.append({
                "full_name": request.data.get(f"guests[{i}][full_name]"),
                "age": request.data.get(f"guests[{i}][age]"),
                "id_number": request.data.get(f"guests[{i}][id_number]", None),
                "id_document": request.FILES.get(f"guests[{i}][id_document]", None),
            })
            i += 1

        if not guests_data:
            raise serializers.ValidationError("At least one guest is required.")

        booking = Booking.objects.create(
            tourist=user,
            **validated_data
        )

        for guest_data in guests_data:
            guest = Guest.objects.create(
                booking=booking,
                full_name=guest_data["full_name"],
                age=guest_data["age"],
                id_number=guest_data["id_number"],
                id_document=guest_data["id_document"],
            )
            QRCode.objects.create(
                booking=booking,
                guest=guest,
                code=f"QR-{booking.id}-{guest.id}",
            )

        return booking


class StaffQRCodeSerializer(serializers.ModelSerializer):
    guest_name = serializers.CharField(source="guest.full_name", read_only=True)

    class Meta:
        model = QRCode
        fields = ["id", "booking", "guest_name", "code", "created_at"]


# ============================================================
# TOUR PACKAGE SERIALIZERS
# ============================================================
class StaffTourPackageImageSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = TourPackageImage
        fields = ["id", "image"]


class StaffTourPackageSerializer(serializers.ModelSerializer):
    images = StaffTourPackageImageSerializer(many=True, required=False)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = TourPackage
        fields = [
            "id",
            "name",
            "short_description",
            "description",
            "base_price",
            "requires_permit",
            "images",
            "uploaded_images",
        ]

    def create(self, validated_data):
        uploaded_images = validated_data.pop("uploaded_images", [])
        tour_package = TourPackage.objects.create(**validated_data)

        for image in uploaded_images:
            TourPackageImage.objects.create(package=tour_package, image=image)

        return tour_package

    def update(self, instance, validated_data):
        uploaded_images = validated_data.pop("uploaded_images", [])
        images_data = validated_data.pop("images", [])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        existing_ids = [img.id for img in instance.images.all()]
        updated_ids = []

        for image_data in images_data:
            image_id = image_data.get("id")
            if image_id and image_id in existing_ids:
                img_instance = TourPackageImage.objects.get(id=image_id, package=instance)
                if "image" in image_data:
                    img_instance.image = image_data["image"]
                    img_instance.save()
                updated_ids.append(image_id)

        for img in instance.images.all():
            if img.id not in updated_ids:
                img.delete()

        for image in uploaded_images:
            TourPackageImage.objects.create(package=instance, image=image)

        return instance


class StaffTourEventSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source="package.name", read_only=True)
    slots_used = serializers.SerializerMethodField()
    slots_available = serializers.ReadOnlyField()
    is_full = serializers.ReadOnlyField()

    class Meta:
        model = TourEvent
        fields = [
            "id",
            "package",
            "package_name",
            "start_date",
            "end_date",
            "slot_limit",
            "slots_used",
            "slots_available",
            "is_full",
            "is_group_event",
            "requires_permit",
            "required_qualification",
            "required_permit_type",
            "stations",
            "created_at",
        ]

    def get_slots_used(self, obj):
        return sum(booking.guests.count() for booking in obj.bookings.all())




class StaffPermitSerializer(serializers.ModelSerializer):
    booking_id = serializers.IntegerField(source="booking.id", read_only=True)
    template_name = serializers.CharField(source="template.name", read_only=True)

    class Meta:
        model = Permit
        fields = [
            "id",
            "booking",
            "booking_id",
            "permit_type",
            "permit_number",
            "issued_date",
            "expiry_date",
            "template",
            "template_name",
            "generated_file",
        ]


class StaffPermitTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermitTemplate
        fields = ["id", "name", "template_file"]


class StaffReportSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = Report
        fields = [
            "id",
            "title",
            "file",
            "created_at",
            "created_by",
            "created_by_name",
        ]


class StaffNotificationSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "user",
            "user_name",
            "title",
            "message",
            "related_booking",
            "is_read",
            "created_at",
        ]


class StaffAuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)
    content_type_name = serializers.CharField(source="content_type.model", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "user",
            "user_name",
            "content_type",
            "content_type_name",
            "object_id",
            "action",
            "message",
            "created_at",
        ]

class StaffQualificationSerializer(serializers.ModelSerializer):
    tour_guides = serializers.StringRelatedField(many=True, read_only=True)

    class Meta:
        model = Qualification
        fields = [
            "id",
            "name",
            "description",
            "tour_guides",
        ]

class StaffPermitTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermitType
        fields = [
            "id",
            "name",
            "description",
            "is_active",
        ]

class StaffStationSerializer(serializers.ModelSerializer):
    staff_names = serializers.SerializerMethodField()

    class Meta:
        model = Station
        fields = [
            "id",
            "name",
            "description",
            "location",
            "staff",
            "staff_names",
            "created_at",
        ]

    def get_staff_names(self, obj):
        return [user.username for user in obj.staff.all()]
