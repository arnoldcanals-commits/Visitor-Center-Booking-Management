from rest_framework import serializers
from ..models import SiteConfiguration, FAQ
from rest_framework.permissions import AllowAny

class SiteConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteConfiguration
        # We include 'fields' to be explicit about what data React gets access to
        fields = [
            'website_name', 
            'about_us', 
            'twitter_url', 
            'facebook_url', 
            'instagram_url', 
            'youtube_url',
            'tiktok_url',
            'contact_email'
        ]

class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ['id', 'question', 'answer', 'order']


from rest_framework import serializers
from api.models import Information


class InformationSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(read_only=True)

    class Meta:
        model = Information
        fields = [
            "id",
            "category",
            "sub_category",
            "categorydesc",
            "title",
            "desc",
            "image",
            "created_at",
        ]
        read_only_fields = fields
