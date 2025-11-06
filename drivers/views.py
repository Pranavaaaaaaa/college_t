# drivers/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_user_role(request):
    """
    Check the role of the logged-in user
    and return it.
    """
    if hasattr(request.user, 'driverprofile'):
        return Response({'role': 'driver'})

    if hasattr(request.user, 'studentprofile'):
        return Response({'role': 'student'})

    if request.user.is_staff:
        return Response({'role': 'admin'})

    return Response({'role': 'unknown'}, status=404)