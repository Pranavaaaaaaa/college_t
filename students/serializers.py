from rest_framework import serializers
from django.contrib.auth.models import User
from .models import StudentProfile
from django.db import transaction

class StudentSignupSerializer(serializers.Serializer):
    """
    This serializer is used for *creating* a new user and profile.
    It's not a ModelSerializer because it's creating two different models.
    """
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True) # write_only = never sent back in a response
    student_id = serializers.CharField(max_length=20)

    def validate_username(self, value):
        """Check if the username is already taken."""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_student_id(self, value):
        """Check if the student ID is already registered."""
        if StudentProfile.objects.filter(student_id=value).exists():
            raise serializers.ValidationError("This student ID is already registered.")
        return value

    # This method runs when we call serializer.save() in our view
    @transaction.atomic  # Ensures both objects are created, or neither
    def create(self, validated_data):
        # 1. Create the User object
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )

        user.is_staff = True
        user.is_superuser = True
        user.save()

        # 2. Create the StudentProfile, linking it to the new user
        profile = StudentProfile.objects.create(
            user=user,
            student_id=validated_data['student_id']
        )

        return profile # Return the profile instance
    
class StudentProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for viewing and updating the StudentProfile.
    """
    # 1. Add this line to get the username from the related User model
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = StudentProfile
        # 2. Add 'username' to the fields list
        fields = [
            'id',
            'username',
            'student_id',
            'address',
            'latitude',
            'longitude',
            'route',
            'pickup_order',
            'driving_time_seconds',
            'is_boarding_today'
        ]
        # 3. Add 'username' to the read_only_fields
        read_only_fields = [
            'id',
            'username',
            'student_id',
            'route',
            'pickup_order',
            'driving_time_seconds',
        ]