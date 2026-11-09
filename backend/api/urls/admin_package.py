from rest_framework.routers import DefaultRouter

from ..views import (  # adjust to wherever you saved views.py (e.g. from ..views import ...)
    AdminActivityViewSet,
    AdminTourPackageImageViewSet,
    AdminTourPackageViewSet,
)

# Unique names on purpose: api/urls/__init__.py uses `from .x import *`, and a module-level
# `router` / `urlpatterns` here would overwrite (or be overwritten by) the ones in the other files.
admin_package_router = DefaultRouter()
admin_package_router.register("packages", AdminTourPackageViewSet, basename="admin-package")
admin_package_router.register("package-images", AdminTourPackageImageViewSet, basename="admin-package-image")
admin_package_router.register("activities", AdminActivityViewSet, basename="admin-activity")

admin_package_urlpatterns = admin_package_router.urls