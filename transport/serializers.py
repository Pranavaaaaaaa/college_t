# transport/serializers.py
from rest_framework import serializers
from students.models import StudentProfile # Import StudentProfile
from transport.models import Route

# This will represent a single "stop" on the route (which is a student)
class RouteStopSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = StudentProfile
        # These are the fields the app needs to draw the route
        fields = ['id','username', 'address', 'latitude', 'longitude', 'pickup_order', 'driving_time_seconds', 'is_boarding_today']