from rest_framework import generics, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAdminUser

from ..models import Article
from ..serializers import ArticleAdminSerializer, ArticleSerializer


class ArticleListView(generics.ListAPIView):
    serializer_class = ArticleSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Article.objects.filter(
            is_active=True,
            is_archived=False,
        ).order_by("-published_at", "-created_at")


class ArticleDetailView(generics.RetrieveAPIView):
    serializer_class = ArticleSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return Article.objects.filter(is_active=True, is_archived=False)


class ArticleAdminViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all()
    serializer_class = ArticleAdminSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
