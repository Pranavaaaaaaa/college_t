# transport/admin.py
from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe
import json
from django.conf import settings # Import settings to get college coords
from .models import Route # Only import Route
from drivers.models import DriverProfile
from students.models import StudentProfile
import requests

@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    # 1. Point to our custom template (This stays the same)
    change_form_template = 'admin/transport/route/change_form.html'

    # 2. Define fields shown in the main list view (This stays the same)
    list_display = ('name', 'assigned_driver', 'student_count')

    # --- Helper methods for list_display (These stay the same) ---
    def student_count(self, obj):
        return obj.students.count()
    student_count.short_description = 'No. of Students'

    def assigned_driver(self, obj):
        driver = DriverProfile.objects.filter(route_assigned=obj).first()
        return driver.user.username if driver else "None"
    assigned_driver.short_description = 'Assigned Driver'
    # --- End Helper methods ---

    # 3. Add data to the template context (MODIFIED)
    def change_view(self, request, object_id, form_url='', extra_context=None):
        extra_context = extra_context or {}

        route = self.get_object(request, object_id)
        if route:
            # Get assigned driver (Same as before)
            driver = DriverProfile.objects.filter(route_assigned=route).first()
            extra_context['assigned_driver_info'] = driver

            # Get assigned students ordered by pickup_order (Same as before)
            students = route.students.select_related('user').order_by('pickup_order')
            extra_context['assigned_students'] = students

            # Prepare student data for the map (Same as before)
            student_locations = []
            ors_coordinates = []
            college_coords = settings.COLLEGE_COORDS

            if students:
                for student in students:
                    if student.latitude and student.longitude:
                        student_locations.append({
                            'lat': student.latitude,
                            'lng': student.longitude,
                            'name': student.user.username,
                            'order': student.pickup_order,
                            'address': student.address
                        })
                        ors_coordinates.append([student.longitude, student.latitude])
                ors_coordinates.append([college_coords['longitude'], college_coords['latitude']])

                try:
                    headers = {'Authorization': settings.ORS_API_KEY, 'Content-Type': 'application/json'}
                    body = {"coordinates": ors_coordinates}
                    res = requests.post(
                        'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
                        json=body, headers=headers, timeout=10
                    )
                    if res.status_code == 200:
                        geom = res.json()['features'][0]['geometry']['coordinates']
                        # Convert [lon, lat] to [lat, lon] for Leaflet
                        polyline = [[coord[1], coord[0]] for coord in geom]
                        extra_context['route_polyline_json'] = mark_safe(json.dumps(polyline))
                except Exception as e:
                    print(f"Admin map route-line failed: {e}")
                    extra_context['route_polyline_json'] = mark_safe(json.dumps([]))
            # --- End Polyline ---

            # Pass student locations JSON to template
            extra_context['student_locations_json'] = mark_safe(json.dumps(student_locations))

            # --- Pass data for WebSocket ---
            # We need to give the template the route name for the WebSocket group
            extra_context['route_channel_group'] = f"bus_route_{route.name.replace(' ', '_')}"
            # We also need to pass the access token
            # This is tricky in admin. We'll use the user's session.
            # NOTE: This only works because the admin page and WebSocket are on the SAME domain.

        return super().change_view(
            request, object_id, form_url, extra_context=extra_context,
        )