# transport/permissions.py
from rest_framework.permissions import BasePermission, IsAdminUser

class IsDriver(BasePermission):
    """
    Allows access only to users with the 'is_driver' flag.
    """
    def has_permission(self, request, view):
        # Check if the user is logged in AND
        # has a related 'driverprofile' object.
        return (
            request.user.is_authenticated and
            hasattr(request.user, 'driverprofile')
        )