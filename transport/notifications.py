# transport/notifications.py
from firebase_admin import messaging

def send_multicast_notification(tokens, title, body):
    """
    Sends a push notification to a list of device tokens.

    :param tokens: A list of FCM registration tokens.
    :param title: The title of the notification.
    :param body: The body/message of the notification.
    """
    if not tokens:
        print("No tokens provided, skipping notification.")
        return

    # Create the message payload
    message = messaging.MulticastMessage(
        data={
            'title': title,
            'body': body,
        },
        tokens=tokens,
    )

    # Send the message
    try:
        response = messaging.send_each_for_multicast(message)
        # This is how we'll test it!
        print(f"Successfully sent notification to {response.success_count} tokens.")
        if response.failure_count > 0:
            print(f"Failed to send to {response.failure_count} tokens.")
    except Exception as e:
        print(f"Error sending notification: {e}")