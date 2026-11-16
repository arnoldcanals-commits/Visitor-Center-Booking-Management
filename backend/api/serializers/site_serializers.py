import json

from rest_framework import serializers
from ..models import Article, SiteConfiguration, FAQ

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


class ArticleSerializer(serializers.ModelSerializer):
    cover_image = serializers.ImageField(read_only=True)

    class Meta:
        model = Article
        fields = [
            "id",
            "title",
            "slug",
            "summary",
            "content",
            "cover_image",
            "cover_image_alt",
            "published_at",
        ]
        read_only_fields = fields


class ArticleAdminSerializer(serializers.ModelSerializer):
    cover_image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Article
        fields = [
            "id",
            "title",
            "slug",
            "summary",
            "content",
            "cover_image",
            "cover_image_alt",
            "is_active",
            "published_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "slug", "published_at", "created_at", "updated_at"]

    def validate_content(self, value):
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except (TypeError, ValueError):
                raise serializers.ValidationError(
                    "Article content must be valid JSON for a Tiptap document."
                )

        if not isinstance(value, dict) or value.get("type") != "doc":
            raise serializers.ValidationError("Article content must be a Tiptap document.")
        return value


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

from rest_framework import serializers

from ..models import DashboardHero, DashboardImage


class DashboardImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardImage
        fields = ["id", "image", "alt", "order"]


class DashboardHeroSerializer(serializers.ModelSerializer):
    images = DashboardImageSerializer(many=True, read_only=True)

    class Meta:
        model = DashboardHero
        fields = ["id", "title", "subtitle", "cta_label", "cta_url", "images"]