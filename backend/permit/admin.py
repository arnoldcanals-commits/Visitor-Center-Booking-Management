from django.contrib import admin
from api.audit import record_audit
from .models import PermitTemplate, Permit

@admin.register(PermitTemplate)
class PermitTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    list_filter = ("is_active",)

    def save_model(self, request, obj, form, change):
        # enforce only one active template at a time
        if obj.is_active:
            active_templates = list(
                PermitTemplate.objects.filter(is_active=True).exclude(pk=obj.pk)
            )
            PermitTemplate.objects.exclude(pk=obj.pk).update(is_active=False)
            for template in active_templates:
                record_audit(
                    template,
                    "updated",
                    {"is_active": {"from": True, "to": False}},
                    actor=request.user,
                )
        super().save_model(request, obj, form, change)


admin.site.register(Permit)