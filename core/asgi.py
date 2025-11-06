# core/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from channels.auth import AuthMiddlewareStack

# Set the settings module environment variable FIRST
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Initialize the regular Django application (for HTTP)
django_asgi_app = get_asgi_application()

# IMPORTANT: Import your WebSocket routing AFTER initializing the app
# This ensures Django's app registry is ready.
from transport.routing import websocket_urlpatterns

# Define the main application router
application = ProtocolTypeRouter({
    # Handle regular HTTP requests using Django's default app
    "http": django_asgi_app,

    # Handle WebSocket requests
    "websocket": AllowedHostsOriginValidator( # Basic security: allows connections from allowed hosts
        AuthMiddlewareStack( # Handles authentication for WebSockets
            URLRouter( # Routes WebSocket paths based on the URL
                websocket_urlpatterns # Use the list of patterns from transport/routing.py
            )
        )
    ),
})