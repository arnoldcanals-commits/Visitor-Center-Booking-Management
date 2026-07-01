# urls.py
from rest_framework.routers import DefaultRouter
from api.views import GuestViewSet

router = DefaultRouter()
router.register(r"guests", GuestViewSet, basename="guest")

urlpatterns = router.urls
