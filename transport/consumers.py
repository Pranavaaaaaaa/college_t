import json
# 1. Import the ASYNC consumer
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import async_to_sync, sync_to_async
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import AccessToken
from channels.db import database_sync_to_async
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth.models import AnonymousUser
from urllib.parse import parse_qs

# Import models to check roles
from students.models import StudentProfile
from drivers.models import DriverProfile

@database_sync_to_async
def get_user_from_scope(scope):
    """
    Gets user from JWT token in query string.
    Also identifies their role, route, and student ID if applicable.
    """
    try:
        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token_key = params.get('token', [None])[0]
        
        if not token_key:
            print("WebSocket Auth: No token. Rejecting.")
            return AnonymousUser(), None, None, None

        token = AccessToken(token_key)
        user_id = token.payload.get('user_id')
        user = User.objects.get(id=user_id)
        
        # Check for driver role
        try:
            driver_profile = DriverProfile.objects.get(user=user)
            if driver_profile.route_assigned:
                route_name = driver_profile.route_assigned.name
                return user, 'driver', route_name, None
            else:
                print(f"WebSocket: Driver {user.username} has no route. Rejecting.")
                return AnonymousUser(), None, None, None
        except DriverProfile.DoesNotExist:
            pass 

        # Check for student role
        try:
            student_profile = StudentProfile.objects.get(user=user)
            if student_profile.route:
                route_name = student_profile.route.name
                student_id = student_profile.id
                return user, 'student', route_name, student_id
            else:
                print(f"WebSocket: Student {user.username} is on waitlist. Rejecting.")
                return AnonymousUser(), None, None, None
        except StudentProfile.DoesNotExist:
            pass

        print(f"WebSocket: User {user.username} has no valid role. Rejecting.")
        return AnonymousUser(), None, None, None

    except (TokenError, InvalidToken, User.DoesNotExist) as e:
        print(f"WebSocket Auth Error: {e}. Rejecting.")
        return AnonymousUser(), None, None, None
    except Exception as e:
        print(f"WebSocket Auth Error (General): {e}. Rejecting.")
        return AnonymousUser(), None, None, None


class BusConsumer(AsyncWebsocketConsumer):
    
    async def connect(self):
        # 1. Get user, role, route name, and student ID
        self.user, self.role, route_name, self.student_id = await get_user_from_scope(self.scope)
        
        if not self.user.is_authenticated:
            await self.close()
            return
            
        # 2. Create group name
        self.channel_group_name = f"bus_route_{route_name.replace(' ', '_')}"

        # 3. Subscribe
        await self.channel_layer.group_add(
            self.channel_group_name,
            self.channel_name
        )

        # 4. Accept
        await self.accept()
        print(f"WebSocket: {self.role} {self.user.username} (Student ID: {self.student_id}) connected to {self.channel_group_name}")

    async def disconnect(self, close_code):
        if hasattr(self, 'channel_group_name'):
            await self.channel_layer.group_discard(
                self.channel_group_name,
                self.channel_name
            )
            print(f"WebSocket: {self.role} {self.user.username} disconnected.")

    # --- Message Handlers (must all be async) ---

    async def send_bus_location(self, event):
        """Send bus location updates to all connected clients"""
        await self.send(text_data=json.dumps({
            'type': 'location',
            'latitude': event['latitude'],
            'longitude': event['longitude']
        }))

    async def send_arrival_notification(self, event):
        """
        Send notification to students only.
        If target_student_id is provided, only send to that specific student.
        """
        if self.role == 'student':
            # Check if this notification is targeted at a specific student
            target_student_id = event.get('target_student_id')
            
            # If no target specified, send to all students (broadcast)
            # If target specified, only send if it matches this student's ID
            if target_student_id is None or target_student_id == self.student_id:
                print(f"[WebSocket] Sending notification to {self.user.username}: {event.get('title')}")
                await self.send(text_data=json.dumps({
                    'type': 'notification',
                    'title': event['title'],
                    'body': event['body']
                }))
            else:
                print(f"[WebSocket] Skipping notification for {self.user.username} (targeted at student {target_student_id})")

    async def student_check_in(self, event):
        """Send check-in status updates to drivers"""
        if self.role == 'driver':
            await self.send(text_data=json.dumps({
                'type': 'student_check_in',
                'student_id': event['student_id'],
                'is_boarding': event['is_boarding']
            }))