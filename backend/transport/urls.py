from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TransportationViewSet, VehicleViewSet


router = DefaultRouter()
router.register(r'transportation', TransportationViewSet, basename='transportation')
router.register(r'vehicle', VehicleViewSet, basename='vehicle')

urlpatterns = [
    path('', include(router.urls)),
]