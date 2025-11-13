"""
Django settings for core project.
This version is configured for Railway.
"""

from pathlib import Path
import os
import dj_database_url
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# --- SECURITY & DEPLOYMENT SETTINGS ---
SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY', 
    'django-insecure-x+-_q9-htdre2$b*r_@77!kfrj@3ve&1wbia*nvf1^z##mb)&e'
)
DEBUG = os.environ.get('DJANGO_DEBUG', '') != 'False'

# --- ALLOWED_HOSTS ---
ALLOWED_HOSTS = []
# --- THIS IS THE FIX ---
# Railway provides this variable automatically
RAILWAY_PUBLIC_DOMAIN = os.environ.get('RAILWAY_PUBLIC_DOMAIN')
if RAILWAY_PUBLIC_DOMAIN:
    # This will be your backend URL, e.g., backend-production-a086.up.railway.app
    ALLOWED_HOSTS.append(RAILWAY_PUBLIC_DOMAIN)
# --- END FIX ---
    
ALLOWED_HOSTS.append('127.0.0.1')
ALLOWED_HOSTS.append('localhost')
# --- END ALLOWED_HOSTS ---


# --- Application definition ---
INSTALLED_APPS = [
    'daphne',
    'channels',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'students',
    'rest_framework',
    'rest_framework_simplejwt',
    'transport',
    'drivers',
    'unassigned',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware', # For static files
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
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
WSGI_APPLICATION = 'core.wsgi.application'
ASGI_APPLICATION = 'core.asgi.application'


# --- DATABASE ---
# Railway provides DATABASE_URL automatically
DATABASES = {
    'default': dj_database_url.config(
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',
        conn_max_age=600
    )
}


# --- PASSWORD VALIDATION ---
AUTH_PASSWORD_VALIDATORS = [
    { 'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator', },
]

# --- INTERNATIONALIZATION ---
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# --- STATIC FILES ---
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


# --- DEFAULT PRIMARY KEY ---
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# --- REST FRAMEWORK & JWT ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication', 
    )
}
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}

# --- CHANNELS & REDIS ---
# Railway provides REDIS_URL automatically
REDIS_URL = os.environ.get('REDIS_URL')

if REDIS_URL:
    # Production (on Railway)
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.pubsub.RedisPubSubChannelLayer',
            'CONFIG': { "hosts": [REDIS_URL], },
        },
    }
else:
    # Local development
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.pubsub.RedisPubSubChannelLayer',
            'CONFIG': { "hosts": [('127.0.0.1', 6379)], },
        },
    }

# --- CORS (Cross-Origin) ---
# We will set this in the Railway dashboard
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
]
# We will add the live frontend URL later
RAILWAY_FRONTEND_URL = os.environ.get('RAILWAY_FRONTEND_URL')
if RAILWAY_FRONTEND_URL:
    frontend_url = RAILWAY_FRONTEND_URL.rstrip('/')
    CORS_ALLOWED_ORIGINS.append(RAILWAY_FRONTEND_URL)


CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# For Django admin to work across origins
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
]

if RAILWAY_FRONTEND_URL:
    frontend_url = RAILWAY_FRONTEND_URL.rstrip('/')
    CSRF_TRUSTED_ORIGINS.append(frontend_url)

# Add your Railway backend domain
RAILWAY_PUBLIC_DOMAIN = os.environ.get('RAILWAY_PUBLIC_DOMAIN')
if RAILWAY_PUBLIC_DOMAIN:
    CSRF_TRUSTED_ORIGINS.append(f'https://{RAILWAY_PUBLIC_DOMAIN}')

# Session cookies
SESSION_COOKIE_SAMESITE = 'None'
SESSION_COOKIE_SECURE = True  # Required for SameSite=None
CSRF_COOKIE_SAMESITE = 'None'
CSRF_COOKIE_SECURE = True

# --- CUSTOM APP SETTINGS ---
ORS_API_KEY = os.environ.get('ORS_API_KEY', 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImZlMDQ0NGUyZDk0YjQzMTJiMjJjMjhlNmEwMjEwYTZjIiwiaCI6Im11cm11cjY0In0=') # Fallback to your local key
COLLEGE_COORDS = {
    "latitude": 12.9003207224315, 
    "longitude": 77.49589092463299,
}
BUS_CAPACITY = 5
LOGOUT_REDIRECT_URL = '/admin/login/'