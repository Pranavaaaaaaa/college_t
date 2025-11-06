from rest_framework import status
from django.contrib.admin.views.decorators import staff_member_required
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .serializers import StudentSignupSerializer, StudentProfileSerializer
from .models import StudentProfile
import requests
from django.shortcuts import render
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

# We use AllowAny so that a user who is not logged in
# can access this specific endpoint to create an account.
@api_view(['POST'])
@permission_classes([AllowAny])
def signup_view(request):
    """
    API endpoint for student registration.
    """
    # We only care about POST data
    if request.method == 'POST':
        # Pass the incoming request data to our serializer
        serializer = StudentSignupSerializer(data=request.data)

        # Check if the data is valid (runs our .validate_... methods)
        if serializer.is_valid():
            # If valid, call our .create() method
            profile = serializer.save() 

            # Send a "201 Created" success response
            return Response(
                {
                    'message': 'Student registered successfully',
                    'username': profile.user.username,
                    'student_id': profile.student_id
                },
                status=status.HTTP_201_CREATED
            )

        # If data is not valid, return the errors
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
@api_view(['GET', 'PUT']) # Allow GET (to view) and PUT (to update)
@permission_classes([IsAuthenticated]) # <-- This is the lock!
def profile_view(request):
    """
    API endpoint for a student to view or update their profile.
    NOW WITH AUTOMATIC GEOCODING!
    """
    try:
        profile = request.user.studentprofile
    except StudentProfile.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = StudentProfileSerializer(profile)
        return Response(serializer.data)

    elif request.method == 'PUT':
       # 1. We now expect lat, lon, AND the address
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        address = request.data.get('address') # We'll get this from the frontend

        if not all([latitude, longitude, address]):
            return Response(
                {'error': 'Latitude, longitude, and address are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. No more API call here! Just save the data.
        profile.address = address
        profile.latitude = float(latitude)
        profile.longitude = float(longitude)
        profile.save()

        # 3. Send the full, updated profile back
        serializer = StudentProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_fcm_token(request):
    """
    API endpoint for a student to save their
    FCM device token.
    """
    token = request.data.get('token')
    if not token:
        return Response(
            {'error': 'FCM token is required.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get the user's profile and save the token
    profile = request.user.studentprofile
    profile.fcm_token = token
    profile.save()

    return Response(
        {'message': 'Token registered successfully.'}, 
        status=status.HTTP_200_OK
    )

@api_view(['GET'])
@permission_classes([AllowAny])
def reverse_geocode_view(request):
    """
    API endpoint to get an address from coordinates.
    Takes 'lat' and 'lon' as query parameters.
    """
    latitude = request.query_params.get('lat')
    longitude = request.query_params.get('lon')

    if not latitude or not longitude:
        return Response(
            {'error': 'lat and lon query parameters are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Call Nominatim's REVERSE geocoding API
    headers = {'User-Agent': 'CollegeTransportApp/1.0'}
    url = 'https://nominatim.openstreetmap.org/reverse'
    params = {
        'format': 'json',
        'lat': latitude,
        'lon': longitude,
        'zoom': 18,
    }

    try:
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        data = response.json()

        address = data.get('display_name')
        if not address:
            return Response(
                {'error': 'Address not found for these coordinates.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Send back just the address
        return Response({'address': address}, status=status.HTTP_200_OK)

    except requests.exceptions.RequestException as e:
        return Response({'error': f'Geocoding service error: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
# students/views.py
# ... (other imports)

@api_view(['GET'])
@permission_classes([AllowAny])
def forward_geocode_view(request):
    """
    API endpoint to get coordinates from an address string.
    Takes 'q' (query) as a query parameter.
    """
    query = request.query_params.get('q')
    if not query:
        return Response(
            {'error': "'q' (query) parameter is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Call the Nominatim API
    headers = {'User-Agent': 'CollegeTransportApp/1.0'}
    url = 'https://nominatim.openstreetmap.org/search'
    params = {
        'format': 'json',
        'q': query,
        'limit': 1,
        'countrycodes': 'in' # Keep it focused on India
    }

    try:
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        data = response.json()

        if not data:
            return Response(
                {'error': 'Address not found. Please be more specific.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Extract the coordinates and full name
        result = data[0]
        latitude = float(result.get('lat'))
        longitude = float(result.get('lon'))
        display_name = result.get('display_name')

        return Response({
            'latitude': latitude,
            'longitude': longitude,
            'address': display_name
        }, status=status.HTTP_200_OK)

    except requests.exceptions.RequestException as e:
        return Response({'error': f'Geocoding service error: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_in_view(request):
    """
    API endpoint for a student to set their boarding status.
    """
    try:
        # Get 'is_boarding' from request body
        is_boarding = request.data.get('is_boarding')
        
        # Find the student profile and update it
        profile = request.user.studentprofile
        profile.is_boarding_today = is_boarding
        profile.save()
        
        return Response({'message': 'Status updated'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
@staff_member_required
def unassigned_students_view(request):
    """
    Custom admin view to list students not assigned to a route.
    """
    unassigned = StudentProfile.objects.select_related('user').filter(
        route__isnull=True,
        latitude__isnull=False
    ).order_by('user__date_joined')

    context = {
        'title': 'Unassigned Students (Waitlist)',
        'unassigned_students': unassigned,
        'has_permission': request.user.is_active and request.user.is_staff,
        'app_label': 'transport',
    }
    return render(request, 'admin/unassigned_students.html', context)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_in_view(request):
    """
    API endpoint for a student to toggle their
    'is_boarding_today' status.
    """
    try:
        profile = request.user.studentprofile
        new_status = request.data.get('is_boarding')

        if new_status is None or not isinstance(new_status, bool):
            return Response({'error': 'is_boarding (boolean) is required.'}, status=400)
        
        # 1. Save new status to database
        profile.is_boarding_today = new_status
        profile.save()

        # 2. Broadcast this update to the route's WebSocket group
        if profile.route:
            channel_layer = get_channel_layer()
            channel_group_name = f"bus_route_{profile.route.name.replace(' ', '_')}"
            
            async_to_sync(channel_layer.group_send)(
                channel_group_name,
                {
                    'type': 'student_check_in', # New message type
                    'student_id': profile.id,
                    'is_boarding': new_status
                }
            )

        return Response(
            {'message': 'Status updated', 'is_boarding': new_status},
            status=status.HTTP_200_OK
        )
    except StudentProfile.DoesNotExist:
        return Response({'error': 'Student profile not found.'}, status=404)
    except Exception as e:
        print(f"Error in check_in_view: {e}")
        return Response({'error': 'An internal error occurred.'}, status=500)