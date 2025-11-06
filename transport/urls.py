# transport/urls.py
from django.urls import path
from . import views


urlpatterns = [
    # This maps the URL .../my-route/ to our my_route_view
    path('my-route/', views.my_route_view, name='my-route'),
    path('update-location/', views.update_bus_location, name='update-location'),
    path('admin-broadcast/', views.admin_broadcast_view, name='admin-broadcast'),
    path('driver/my-route/', views.driver_route_view, name='driver-route'),
    path('driver/reorder-stops/', views.driver_reorder_view, name='driver-reorder'),
    path('route-geometry/', views.get_route_geometry_view, name='route-geometry'),
    path('test/', views.test_view, name='test-transport'),
    path('admin/trigger-optimization/', views.trigger_optimization_view, name='admin-trigger-optimization'),
    path('admin/route/<int:route_id>/bus-location/', views.get_bus_location_view, name='admin-get-bus-location'),
    # path('reset-notification-status/', views.reset_notification_status_view, name='reset-notification-status'),
]