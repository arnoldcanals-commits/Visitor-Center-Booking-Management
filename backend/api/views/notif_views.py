# views.py
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..models import Notification
from ..serializers import NotificationSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated] # Ensures JWT is valid
    pagination_class = None
    def get_queryset(self):
        """
        This is where we check the JWT user. 
        Only return notifications belonging to the logged-in user.
        """
        return Notification.objects.filter(
            user=self.request.user, 
            is_active=True
        ).order_by('-created_at')

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """
        Custom endpoint: POST /api/notifications/{id}/mark_as_read/
        """
        notification = self.get_object()
        notification.mark_as_read() # Using the method you already wrote in models.py
        return Response({'status': 'notification marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """
        Custom endpoint: POST /api/notifications/mark_all_as_read/
        """
        self.get_queryset().filter(is_read=False).update(
            is_read=True, 
            read_at=timezone.now()
        )
        return Response({'status': 'all notifications marked as read'})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """
        Endpoint: GET /api/notifications/unread_count/
        """
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})