# drivers/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('check-role/', views.check_user_role, name='check-role'),
]