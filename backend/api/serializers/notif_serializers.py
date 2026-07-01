# serializers.py
from rest_framework import serializers
from ..models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    # We can add a human-readable time (e.g., "2 minutes ago")
    created_at_formatted = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 
            'notification_type', 
            'title', 
            'message', 
            'related_booking', 
            'target_url', 
            'is_read', 
            'read_at', 
            'created_at',
            'created_at_formatted'
        ]
        read_only_fields = ['id', 'notification_type', 'title', 'message', 'created_at']

    def get_created_at_formatted(self, obj):
        # Optional: You can use a library like 'humanize' here
        return obj.created_at.strftime("%b %d, %Y %H:%M")