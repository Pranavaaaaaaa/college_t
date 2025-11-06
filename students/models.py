# students/models.py
from django.db import models
from django.contrib.auth.models import User
# Import the Route model
from transport.models import Route 

class StudentProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    student_id = models.CharField(max_length=20, unique=True)

    address = models.CharField(max_length=255, blank=True, null=True)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)

    route = models.ForeignKey(
        Route,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='students'
    )
    pickup_order = models.PositiveIntegerField(
        blank=True, 
        null=True
    )

    driving_time_seconds = models.PositiveIntegerField(
        blank=True, 
        null=True
    )

    is_boarding_today = models.BooleanField(default=False)
    
    # NEW FIELD: Track the last notification threshold sent
    last_notification_distance = models.IntegerField(
        blank=True,
        null=True,
        help_text="Last geofence threshold (in meters) for which a notification was sent"
    )

    def __str__(self):
        return self.user.username
    
class StudentAccount(User):
    """
    This is a Proxy Model. It doesn't create a new database table.
    It just creates a new entry in the admin for the User model.
    """
    class Meta:
        proxy = True
        verbose_name = 'Student'
        verbose_name_plural = 'Students'