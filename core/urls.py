from django.contrib import admin
from django.urls import path, include
from django.conf import settings # 1. Make sure settings is imported
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from students.views import unassigned_students_view 

urlpatterns = [
    path('admin/unassigned_students/', unassigned_students_view, name='unassigned_students'),
    
    # --- THIS IS THE FIX ---
    # It now correctly uses RAILWAY_FRONTEND_URL from your settings
    path(
        'admin/login/',
        admin.site.login,
        {'extra_context': {
            'FRONTEND_URL': settings.RAILWAY_FRONTEND_URL or 'http://localhost:3000'
        }},
        name='login'
    ),
    # -----------------------

    path('admin/', admin.site.urls), # This handles all other admin URLs
    
    # --- (Rest of your API paths) ---
    path('api/students/', include('students.urls')),
    path('api/transport/', include('transport.urls')),
    path('api/drivers/', include('drivers.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
