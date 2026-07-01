from django.contrib import admin
from .models import Transportation, Vehicle

@admin.register(Transportation)
class TransportationAdmin(admin.ModelAdmin):
    # 1. Columns to display in the admin list view
    list_display = (
        'id', 
        'vehicle_name', 
        'category', 
        'plate_number', 
        'capacity', 
        'status', 
        'schedule'
    )
    
    # 2. Add filters on the right sidebar for quick sorting
    list_filter = ('status', 'category', 'schedule')
    
    # 3. Add a search bar to search across these specific fields
    search_fields = ('vehicle_name', 'plate_number', 'driver', 'owner', 'title')
    
    # 4. Organize the details edit page into structural sections (Fieldsets)
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'desc', 'category', 'sub_category', 'categorydesc')
        }),
        ('Vehicle & Driver Details', {
            'fields': ('vehicle_name', 'plate_number', 'capacity', 'driver', 'owner', 'affiliate')
        }),
        ('Logistics & Status', {
            'fields': ('schedule', 'pickup_location', 'dropoff_location', 'status')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',), # Hides this section by default
        }),
    )

    # 5. Read-only fields (since auto_now and auto_now_add fields can't be manually edited)
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
        'owner'
    )
      
    readonly_fields = ('created_at', 'updated_at')