from django.contrib import admin
from django.utils.html import format_html
from .models import (
    User,
    Qualification,
    PermitType,
    TourPackage,
    TourPackageImage,
    TourEvent,
    TourEventItinerary,
    Station,
    Booking,
    Guest,
    BookingGuest,
    QRCode,
    Permit,
    PermitTemplate,
    SystemSetting,
    Report,
    Notification,
    AuditLog,
    SiteConfiguration,
    FAQ,
    Review,
    EventStation,
    Information,
    EventStationCheck,
    EventStationGuestCheck,
    EventStationGuideCheck,
)

# =====================================================
# User Admin
# =====================================================
@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("email", "username", "role", "status", "is_active")
    list_filter = ("role", "status", "is_active")
    search_fields = ("email", "username")
    filter_horizontal = ("qualifications",)

    def has_module_permission(self, request):
        return request.user.is_superuser or getattr(request.user, "role", None) == "admin"

    def has_change_permission(self, request, obj=None):
        return self.has_module_permission(request)


# =====================================================
# Core Reference Models
# =====================================================
@admin.register(Qualification)
class QualificationAdmin(admin.ModelAdmin):
    search_fields = ("name",)


@admin.register(PermitType)
class PermitTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)


# =====================================================
# Tour Packages
# =====================================================
class TourPackageImageInline(admin.TabularInline):
    model = TourPackageImage
    extra = 1


@admin.register(TourPackage)
class TourPackageAdmin(admin.ModelAdmin):
    list_display = ("name", "base_price", "requires_permit", "created_at")
    search_fields = ("name",)
    list_filter = ("requires_permit",)
    inlines = [TourPackageImageInline]


# =====================================================
# Bookings & Guests
# =====================================================
@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):
    list_display = ("full_name", "owner", "age", "local", "created_at")
    search_fields = ("full_name", "id_number")
    autocomplete_fields = ("owner",)


@admin.register(BookingGuest)
class BookingGuestAdmin(admin.ModelAdmin):
    list_display = ("guest", "booking", "created_at")
    autocomplete_fields = ("guest", "booking")
    search_fields = ("guest__full_name", "booking__id")


class BookingGuestInline(admin.TabularInline):
    model = BookingGuest
    extra = 1
    autocomplete_fields = ("guest",)


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("id", "tourist", "package", "event", "status", "assigned_guide", "created_at")
    list_filter = ("status", "is_archived")
    search_fields = ("tourist__email", "package__name", "id")
    autocomplete_fields = ("tourist", "package", "event")
    readonly_fields = ("assigned_guide", "itinerary", "created_at")
    inlines = [BookingGuestInline]


# =====================================================
# Tour Events & Itineraries
# =====================================================
class EventStationInline(admin.TabularInline):
    model = EventStation
    extra = 1
    autocomplete_fields = ("station",)


@admin.register(TourEventItinerary)
class TourEventItineraryAdmin(admin.ModelAdmin):
    list_display = ("event", "uploaded_by", "created_at")
    autocomplete_fields = ("event", "uploaded_by")
    # FIXED: Added search_fields to support autocomplete in TourEventAdmin
    search_fields = ("event__package__name", "file")


@admin.register(TourEvent)
class TourEventAdmin(admin.ModelAdmin):
    list_display = ("package", "start_date", "end_date", "slot_limit", "is_group_event", "assigned_guide", "slots_used")
    list_filter = ("is_group_event", "requires_permit")
    search_fields = ("package__name",)
    autocomplete_fields = (
        "package",
        "assigned_guide",
        "required_qualification",
        "required_permit_type",
        "active_itinerary",
    )
    inlines = [EventStationInline]


# =====================================================
# Stations
# =====================================================
@admin.register(Station)
class StationAdmin(admin.ModelAdmin):
    list_display = ("name", "location", "created_at")
    search_fields = ("name", "location")
    filter_horizontal = ("staff",)


# =====================================================
# QR Codes
# =====================================================
@admin.register(QRCode)
class QRCodeAdmin(admin.ModelAdmin):
    list_display = ("guest_name", "booking_id", "code", "created_at")
    search_fields = ("code", "booking_guest__guest__full_name")
    autocomplete_fields = ("booking_guest",)

    def guest_name(self, obj):
        return obj.booking_guest.guest.full_name if obj.booking_guest else "—"

    def booking_id(self, obj):
        return obj.booking_guest.booking.id if obj.booking_guest else "—"


# =====================================================
# Permits
# =====================================================
@admin.register(PermitTemplate)
class PermitTemplateAdmin(admin.ModelAdmin):
    search_fields = ("name",)


@admin.register(Permit)
class PermitAdmin(admin.ModelAdmin):
    list_display = ("permit_number", "booking", "permit_type", "issued_date")
    autocomplete_fields = ("booking", "permit_type", "template")
    search_fields = ("permit_number",)


# =====================================================
# System / CMS / Logs
# =====================================================
@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    search_fields = ("key",)


@admin.register(SiteConfiguration)
class SiteConfigurationAdmin(admin.ModelAdmin):
    list_display = ("website_name", "contact_email")


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ("question", "is_active", "order")
    ordering = ("order",)


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("title", "created_at", "created_by")
    autocomplete_fields = ("created_by",)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "title", "is_read", "created_at")
    autocomplete_fields = ("user", "related_booking")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "user", "content_type", "object_id", "created_at")
    autocomplete_fields = ("user",)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("booking", "reviewer", "target_type", "rating")
    autocomplete_fields = ("booking", "reviewer", "package", "tour_guide")


@admin.register(Information)
class InformationAdmin(admin.ModelAdmin):
    list_display = ("category", "sub_category", "title", "created_at")
    list_filter = ("category", "sub_category")
    search_fields = ("title", "desc")

@admin.register(EventStationCheck)
class EventStationCheckAdmin(admin.ModelAdmin):
    list_display = ("event", "station")

@admin.register(EventStationGuestCheck)
class EventStationGuestCheckAdmin(admin.ModelAdmin):
    list_display = ("event_station_check", "booking_guest")

@admin.register(EventStationGuideCheck)
class EventStationGuideCheckAdmin(admin.ModelAdmin):
    list_display = ("event_station_check", "guide")

