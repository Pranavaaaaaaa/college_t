from django.urls import path
from transport import views as v 
from . import views


urlpatterns = [
    # This maps the URL .../signup/ to our signup_view
    path('signup/', views.signup_view, name='student-signup'),
    path('profile/', views.profile_view, name='student-profile'),
    path('register-token/', views.register_fcm_token, name='register-token'),
    path('reverse-geocode/', views.reverse_geocode_view, name='reverse-geocode'),
    path('forward-geocode/', views.forward_geocode_view, name='forward-geocode'),
    path('reset-notification-status/', v.reset_notification_status_view, name='reset-notification-status'),
    path('check-in/', views.check_in_view, name='check-in'),
]