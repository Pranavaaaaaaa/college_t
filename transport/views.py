import requests
from io import StringIO
import json
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from django.core.management import call_command
from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

# Import all your models and helpers
from .models import Route
from students.models import StudentProfile
from drivers.models import DriverProfile 
from .serializers import RouteStopSerializer
from .permissions import IsDriver, IsAdminUser
from .utils import haversine

# --- Helper Function ---
def _get_address_from_coords(lat, lon):
    """
    Helper function to get an address string from coordinates
    using Nominatim.
    """
    headers = {'User-Agent': 'CollegeTransportApp/1.0'}
    url = 'https://nominatim.openstreetmap.org/reverse'
    params = {'format': 'json', 'lat': lat, 'lon': lon, 'zoom': 18}
    try:
        response = requests.get(url, params=params, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
        return data.get('display_name', 'Address not found')
    except Exception as e:
        print(f"Reverse geocode helper failed: {e}")
        return f"Near {lat:.4f}, {lon:.4f}"

# --- Student Views ---
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_route_view(request):
    """
    API endpoint for a student to get their assigned route.
    Works with the new "Door-to-Door" model.
    """
    student_profile = request.user.studentprofile
    assigned_route = student_profile.route

    if assigned_route is None:
        waitlist_count = StudentProfile.objects.filter(
            route__isnull=True, 
            latitude__isnull=False
        ).count()
        bus_capacity = settings.BUS_CAPACITY
        return Response(
            {'message': f'You are on the waitlist. {waitlist_count} student(s) are waiting for a new route (need {bus_capacity}).'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    all_stops = StudentProfile.objects.filter(route=assigned_route).order_by('pickup_order')
    stops_serializer = RouteStopSerializer(all_stops, many=True)
    
    response_data = {
        'route_name': assigned_route.name,
        'your_pickup_order': student_profile.pickup_order,
        'all_stops_on_route': stops_serializer.data
    }
    return Response(response_data, status=status.HTTP_200_OK)

# --- NEW ENDPOINT TO RESET NOTIFICATION STATUS ---
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_notification_status_view(request):
    """
    API endpoint for a student to reset their notification
    tracking status. This is called on login.
    """
    try:
        student_profile = request.user.studentprofile
        # Reset the last notified distance to None
        student_profile.last_notification_distance = None
        student_profile.save(update_fields=['last_notification_distance'])
        return Response(
            {'message': 'Notification status reset successfully.'},
            status=status.HTTP_200_OK
        )
    except StudentProfile.DoesNotExist:
        return Response({'error': 'Student profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- Driver Views ---
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDriver])
def update_bus_location(request):
    """
    API endpoint for the 'Driver App' to post the bus's
    current location. Includes Geofence Notifications.
    """
    latitude = request.data.get('latitude')
    longitude = request.data.get('longitude')
    if not latitude or not longitude:
        return Response({'error': 'Latitude and longitude are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        driver_profile = request.user.driverprofile
        current_route = driver_profile.route_assigned
        if current_route is None:
            raise AttributeError("Driver is not assigned to a route.")

        driver_profile.last_latitude = latitude
        driver_profile.last_longitude = longitude
        driver_profile.last_seen = timezone.now()
        driver_profile.save()

        route_name = current_route.name
        channel_group_name = f"bus_route_{route_name.replace(' ', '_')}"
    except AttributeError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"Error in update_bus_location (Profile section): {e}")
        return Response({'error': 'An internal error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # 4. WebSocket Broadcast (for live map)
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            channel_group_name,
            {
                'type': 'send_bus_location',
                'latitude': latitude,
                'longitude': longitude,
            }
        )
    except Exception as e:
        print(f"Error sending WebSocket broadcast: {e}")

    # 5. IMPROVED Geofence Notification Logic with per-student targeting
    try:
        # Define the notification thresholds in meters (sorted descending)
        # FINAL threshold is 30 meters - only sent once as the "last call"
        NOTIFICATION_DISTANCES = [500, 400, 300, 200, 100, 30]
        FINAL_THRESHOLD = 30  # Special handling for the final notification
        
        students_on_route = current_route.students.filter(is_boarding_today=True)
        
        for student in students_on_route:
            if not student.latitude or not student.longitude:
                continue
                
            distance_km = haversine(
                longitude, latitude,
                student.longitude, student.latitude
            )
            distance_meters = int(distance_km * 1000)
            
            print(f"[Geofence] Distance to {student.user.username}: {distance_meters}m (Last notified: {student.last_notification_distance})")

            # Find which threshold we're currently inside (the most specific one)
            current_threshold = None
            for threshold in NOTIFICATION_DISTANCES:
                if distance_meters <= threshold:
                    current_threshold = threshold
                    # We do NOT break, so it finds the smallest threshold
            
            # If we're outside all thresholds (> 500m), reset tracking
            if current_threshold is None:
                if student.last_notification_distance is not None:
                    student.last_notification_distance = None
                    student.save(update_fields=['last_notification_distance'])
                    print(f"[Geofence] Bus left 500m zone for {student.user.username}. Reset.")
                continue
            
            # Special handling for the 30m final notification
            # Only send it ONCE when we first enter the 30m zone
            if current_threshold <= FINAL_THRESHOLD:
                # Only send if we haven't already sent the 30m notification
                if student.last_notification_distance != FINAL_THRESHOLD:
                    print(f"[Geofence] 🚨 FINAL NOTIFICATION - Sending {current_threshold}m alert to {student.user.username}")
                    
                    async_to_sync(channel_layer.group_send)(
                        channel_group_name,
                        {
                            'type': 'send_arrival_notification',
                            'title': f"🚨 Bus is HERE! ({distance_meters}m)",
                            'body': f"FINAL CALL! The bus for {route_name} is at your stop. Please be ready!",
                            'target_student_id': student.id
                        }
                    )
                    
                    student.last_notification_distance = FINAL_THRESHOLD
                    student.save(update_fields=['last_notification_distance'])
                    print(f"[Geofence] ✅ FINAL notification sent. No more will be sent until reset.")
                else:
                    print(f"[Geofence] Already sent 30m final notification to {student.user.username}. Skipping.")
                
                continue  # Skip regular logic for 30m zone
            
            # Regular threshold logic (for 500m, 400m, 300m, 200m, 100m)
            # We send if: (1) never sent before OR (2) crossed into a smaller threshold
            should_send = (
                student.last_notification_distance is None or 
                current_threshold < student.last_notification_distance
            )
            
            if should_send:
                print(f"[Geofence] ✉️ Sending {current_threshold}m notification to {student.user.username}")
                
                async_to_sync(channel_layer.group_send)(
                    channel_group_name,
                    {
                        'type': 'send_arrival_notification',
                        'title': f"Bus is ~{current_threshold}m away!",
                        'body': f"The bus for {route_name} is approaching your stop. Current distance: {distance_meters}m",
                        'target_student_id': student.id
                    }
                )
                
                # Update the database with the new threshold
                student.last_notification_distance = current_threshold
                student.save(update_fields=['last_notification_distance'])
                print(f"[Geofence] ✅ Notification sent and saved for {current_threshold}m threshold")

    except Exception as e:
        print(f"Error in geofence logic: {e}")
        import traceback
        traceback.print_exc()

    return Response(status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsDriver])
def driver_route_view(request):
    """
    API endpoint for a DRIVER to get their assigned route.
    """
    driver_profile = request.user.driverprofile
    assigned_route = driver_profile.route_assigned
    if assigned_route is None:
        return Response(
            {'message': 'You are not assigned to a route.'},
            status=status.HTTP_404_NOT_FOUND
        )
    all_stops = StudentProfile.objects.filter(
        route=assigned_route
    ).order_by('pickup_order')
    serializer = RouteStopSerializer(all_stops, many=True)
    response_data = {
        'route_name': assigned_route.name,
        'all_stops_on_route': serializer.data
    }
    return Response(response_data, status=status.HTTP_200_OK)

@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsDriver])
@transaction.atomic
def driver_reorder_view(request):
    """
    API endpoint for a DRIVER to change the pickup_order
    of students on their route.
    """
    driver_profile = request.user.driverprofile
    assigned_route = driver_profile.route_assigned
    if assigned_route is None:
        return Response({'error': 'You are not assigned to a route.'}, status=400)

    stop_ids = request.data.get('stop_ids')
    if not stop_ids or not isinstance(stop_ids, list):
        return Response({'error': '"stop_ids" must be a list.'}, status=400)

    students_on_route = StudentProfile.objects.filter(
        route=assigned_route
    ).in_bulk()
    
    if set(stop_ids) != set(students_on_route.keys()):
        return Response({'error': 'List of IDs does not match students on route.'}, status=400)
        
    for index, student_id in enumerate(stop_ids):
        order = index + 1
        student = students_on_route[student_id]
        student.pickup_order = order
        student.save()
        
    return Response(
        {'message': 'Route re-ordered successfully.'},
        status=status.HTTP_200_OK
    )

# --- Admin Views ---
@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_broadcast_view(request):
    """
    API endpoint for an Admin to send a broadcast
    message to all students on a specific route. (WebSocket Version)
    """
    route_id = request.data.get('route_id')
    message_title = request.data.get('message_title')
    message_body = request.data.get('message_body')

    if not all([route_id, message_title, message_body]):
        return Response({'error': 'route_id, message_title, and message_body are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        route = Route.objects.get(id=route_id)
    except Route.DoesNotExist:
        return Response({'error': 'Route not found.'}, status=status.HTTP_404_NOT_FOUND)

    students_on_route = route.students.all()
    if not students_on_route:
         return Response({'message': 'No students assigned to this route.'}, status=status.HTTP_200_OK)

    try:
        channel_layer = get_channel_layer()
        channel_group_name = f"bus_route_{route.name.replace(' ', '_')}"
        print(f"Admin broadcasting to {channel_group_name}...")
        
        async_to_sync(channel_layer.group_send)(
            channel_group_name,
            {
                'type': 'send_arrival_notification',
                'title': message_title,
                'body': message_body
            }
        )
        return Response(
            {'message': f"Notification sent to {students_on_route.count()} users on {route.name}."},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        print(f"Error in admin_broadcast_view: {e}")
        return Response({'error': 'Failed to send broadcast.'}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def trigger_optimization_view(request):
    """
    API endpoint for an Admin to trigger the optimize_routes command.
    """
    try:
        print("Admin triggered route optimization.")
        out = StringIO()
        call_command('optimize_routes', stdout=out)
        output = out.getvalue()
        return Response({
            "message": "Optimization command executed.",
            "output": output
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            "message": "Error running optimization command.",
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def get_bus_location_view(request, route_id):
    """
    API endpoint for an Admin to get the last known location
    of the driver assigned to a specific route.
    """
    try:
        driver = DriverProfile.objects.get(route_assigned__id=route_id)
        if driver.last_latitude is None:
            return Response({'error': 'Driver has not broadcasted a location yet.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            'latitude': driver.last_latitude,
            'longitude': driver.last_longitude,
            'last_seen': driver.last_seen,
            'driver_name': driver.user.username
        }, status=status.HTTP_200_OK)
    except DriverProfile.DoesNotExist:
        return Response({'error': 'No driver is assigned to this route.'}, status=status.HTTP_404_NOT_FOUND)

# --- Geometry and Test Views ---
ORS_DIRECTIONS_ENDPOINT = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson'

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_route_geometry_view(request):
    """
    API endpoint to get route geometry AND the bus's current address.
    """
    try:
        start_lon = float(request.query_params['start_lon'])
        start_lat = float(request.query_params['start_lat'])
        end_lon = float(request.query_params['end_lon'])
        end_lat = float(request.query_params['end_lat'])
    except (KeyError, ValueError, TypeError):
        return Response(
            {'error': 'Missing or invalid query parameters (start_lon, start_lat, end_lon, end_lat).'},
            status=status.HTTP_400_BAD_REQUEST
        )

    bus_address = _get_address_from_coords(start_lat, start_lon)
    headers = {
        'Authorization': settings.ORS_API_KEY,
        'Content-Type': 'application/json'
    }
    body = {
        "coordinates": [[start_lon, start_lat], [end_lon, end_lat]],
    }

    try:
        res = requests.post(ORS_DIRECTIONS_ENDPOINT, json=body, headers=headers, timeout=10)
        if res.status_code != 200:
             print(f"ROUTE GEOMETRY VIEW: ORS API returned error {res.status_code}: {res.text}")
             return Response({'error': f'ORS API Error {res.status_code}: {res.text}'}, status=status.HTTP_502_BAD_GATEWAY)
        
        data = res.json()
        geometry = data['features'][0]['geometry']['coordinates']
        polyline_coords = [[coord[1], coord[0]] for coord in geometry]
        snapped_start_point = polyline_coords[0] if polyline_coords else None

        return Response({
            'polyline': polyline_coords,
            'snapped_start_point': snapped_start_point,
            'bus_address': bus_address
        }, status=status.HTTP_200_OK)
    except requests.exceptions.Timeout:
         print("ROUTE GEOMETRY VIEW: ORS API call timed out.")
         return Response({'error': 'ORS API call timed out.'}, status=status.HTTP_504_GATEWAY_TIMEOUT)
    except requests.exceptions.RequestException as e:
        print(f"ROUTE GEOMETRY VIEW: ORS API Request Error: {e}")
        return Response({'error': f'ORS API Error: {e}'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except (IndexError, KeyError) as e:
         print(f"ROUTE GEOMETRY VIEW: Error parsing ORS response: {e}")
         return Response({'error': f'Could not parse ORS response: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        print(f"ROUTE GEOMETRY VIEW: Unexpected error: {e}")
        return Response({'error': f'An unexpected error occurred: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['GET'])
@permission_classes([AllowAny])
def test_view(request):
    return Response({"message": "Transport app routing works!"})