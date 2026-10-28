from django.contrib import admin
from .models import (
    Transportation,
    Vehicle,
    Location,
    TransportationStop,
    TransportPassenger,
)


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'latitude', 'longitude', 'address')
    search_fields = ('name', 'address')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'vehicle_name',
        'category',
        'plate_number',
        'capacity',
        'status',
        'driver',
        'owner',
    )

    list_filter = ('status', 'category')

    search_fields = ('vehicle_name', 'plate_number', 'owner', 'driver__username', 'driver__email')

    autocomplete_fields = ('driver',)

    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'desc', 'category', 'sub_category', 'categorydesc')
        }),
        ('Vehicle Details', {
            'fields': ('vehicle_name', 'plate_number', 'capacity', 'driver', 'owner', 'affiliate', 'status')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    readonly_fields = ('created_at', 'updated_at')


class TransportationStopInline(admin.TabularInline):
    model = TransportationStop
    extra = 1
    ordering = ('sequence',)
    fields = (
        'sequence',
        'location',
        'expected_arrival',
        'expected_departure',
        'actual_arrival',
        'actual_departure',
        'notes',
    )
    autocomplete_fields = ('location',)


class TransportPassengerInline(admin.TabularInline):
    model = TransportPassenger
    extra = 1
    fields = (
        'name',
        'contact_number',
        'boarding_stop',
        'alighting_stop',
        'status',
        'notes',
    )

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        # Restrict boarding_stop / alighting_stop choices to stops
        # belonging to the Transportation this inline is attached to.
        if db_field.name in ('boarding_stop', 'alighting_stop'):
            parent_id = request.resolver_match.kwargs.get('object_id')
            if parent_id:
                kwargs['queryset'] = TransportationStop.objects.filter(
                    transportation_id=parent_id
                ).order_by('sequence')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Transportation)
class TransportationAdmin(admin.ModelAdmin):
    # 1. Columns to display in the admin list view
    list_display = (
        'id',
        'title',
        'vehicle',
        'category',
        'status',
        'owner_display',
        'affiliate_display',
        'max_capacity_display',
        'occupied_seats_display',
        'available_seats_display',
    )

    # 2. Add filters on the right sidebar for quick sorting
    list_filter = ('status', 'category')

    # 3. Add a search bar to search across these specific fields
    # (FK/related fields use the __ lookup to reach a field on the related model)
    search_fields = (
        'title',
        'vehicle__vehicle_name',
        'vehicle__plate_number',
        'vehicle__owner',
        'driver__username',
        'driver__email',
    )

    # FK fields get a searchable widget instead of a giant dropdown
    autocomplete_fields = ('vehicle', 'driver')

    inlines = (TransportationStopInline, TransportPassengerInline)

    # 4. Organize the details edit page into structural sections (Fieldsets)
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'desc', 'category', 'sub_category', 'categorydesc')
        }),
        ('Vehicle & Driver Details', {
            'fields': ('vehicle', 'driver', 'owner_display', 'affiliate_display', 'max_capacity_display')
        }),
        ('Logistics & Status', {
            'fields': (
                'status',
                'actual_departure_time',
                'actual_arrival_time',
                'notes',
                'occupied_seats_display',
                'available_seats_display',
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),  # Hides this section by default
        }),
    )

    # 5. Read-only fields — includes auto_now/auto_now_add fields plus every
    # value derived from the vehicle/route/passengers, since none of those
    # are directly editable model fields anymore.
    readonly_fields = (
        'created_at',
        'updated_at',
        'owner_display',
        'affiliate_display',
        'max_capacity_display',
        'occupied_seats_display',
        'available_seats_display',
    )

    # --- Derived-value display methods (owner/affiliate/capacity come from Vehicle;
    # occupied/available seats come from route + passenger calculations) ---
    @admin.display(description='Owner')
    def owner_display(self, obj):
        return obj.owner

    @admin.display(description='Affiliate')
    def affiliate_display(self, obj):
        return obj.affiliate

    @admin.display(description='Max Capacity')
    def max_capacity_display(self, obj):
        return obj.max_capacity

    @admin.display(description='Occupied Seats')
    def occupied_seats_display(self, obj):
        return obj.occupied_seats

    @admin.display(description='Available Seats')
    def available_seats_display(self, obj):
        return obj.available_seats