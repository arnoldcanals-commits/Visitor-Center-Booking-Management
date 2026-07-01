"""
Django settings for backend project.
"""

from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
import os

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "django-insecure-#ei)of7qtv&uj87#=d7(9dx(2s%e4li2r(f#r-^r$f3a%sk2e9")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# ✅ Remove spaces and duplicates
ALLOWED_HOSTS = ["148.230.100.89", "localhost",  "sablayanvisitorcenter.com","www.sablayanvisitorcenter.com",'127.0.0.1']

# ✅ Fix minor typo: “CORS_ALLOWS_CREDENTIALS” → “CORS_ALLOW_CREDENTIALS”
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True

# ✅ CSRF_TRUSTED_ORIGINS must include full protocol (http or https)
CSRF_TRUSTED_ORIGINS = [
    "http://148.230.100.89",
    "http://localhost",
    "http://sablayanvisitorcenter.com",
    "https://sablayanvisitorcenter.com",
     "http://localhost:5173",
     
]
CORS_ALLOWED_ORIGINS = [
    "https://sablayanvisitorcenter.com",
    "http://sablayanvisitorcenter.com",
    "http://148.230.100.89",
     "http://localhost:5173",
     "http://localhost:5174",
     "http://localhost:5175",
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
}

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'api.apps.ApiConfig',
    'billing',
    'rest_framework',
    'corsheaders',
    'transport',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',  
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / "frontend" / "dist"],  # React build output
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',  # ✅ fine for testing, but use MySQL/PostgreSQL later
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]

AUTH_USER_MODEL = 'api.User'

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

import environ
env = environ.Env()

environ.Env.read_env()

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST='smtp.gmail.com'
EMAIL_PORT='587'
EMAIL_USE_TLS='True'
EMAIL_HOST_USER='sbvc2026@gmail.com'
EMAIL_HOST_PASSWORD="poycqjleuyvqojxf"
DEFAULT_FROM_EMAIL='Sablayan Tourism <sbvs2026@gmail.com>'

FRONTEND_URL='https://yourdomain.com'

