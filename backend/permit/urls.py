from django.urls import path
from .views import MyPermitsView, CreatePermitView, PermitDetailView, MarkPermitPaidView, MarkPermitSignedView, AdminPermitListView
from .views import PermitTemplateListCreateView, ActivatePermitTemplateView

urlpatterns = [
    path("permits/", CreatePermitView.as_view(), name="create-permit"),
    path("permits/<int:pk>/", PermitDetailView.as_view(), name="permit-detail"),
    path("permits/<int:pk>/pay/", MarkPermitPaidView.as_view(), name="permit-pay"),
    path("permits/<int:pk>/sign/", MarkPermitSignedView.as_view(), name="permit-sign"),
    path("permits/admin/", AdminPermitListView.as_view(), name="admin-permit-list"),
    path("permits/mine/", MyPermitsView.as_view(), name="my-permits"),
    path("permit-templates/", PermitTemplateListCreateView.as_view(), name="permit-template-list"),
    path("permit-templates/<int:pk>/activate/", ActivatePermitTemplateView.as_view(), name="permit-template-activate"),


]




