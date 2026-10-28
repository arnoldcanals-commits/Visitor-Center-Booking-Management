from django.contrib import admin
from .models import PermitTemplate, Permit

@admin.register(PermitTemplate)
class PermitTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    list_filter = ("is_active",)

    def save_model(self, request, obj, form, change):
        # enforce only one active template at a time
        if obj.is_active:
            PermitTemplate.objects.exclude(pk=obj.pk).update(is_active=False)
        super().save_model(request, obj, form, change)


admin.site.register(Permit)