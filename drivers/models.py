from django.db import models
from django.contrib.auth.models import User
from transport.models import Route

class DriverProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)

    # We'll link the driver to a route (the admin will do this)
    route_assigned = models.ForeignKey(
        Route,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='drivers'
    )

    license_number = models.CharField(max_length=100, unique=True)

    last_latitude = models.FloatField(blank=True, null=True)
    last_longitude = models.FloatField(blank=True, null=True)
    last_seen = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return self.user.username