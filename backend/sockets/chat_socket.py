import jwt
from flask import request
from flask_socketio import emit, join_room, leave_room
from config import Config
from models.schema_models import db, User, Booking, Message

def verify_socket_token(token):
    if not token:
        return None
    try:
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])
        return payload.get('user_id')
    except Exception:
        return None

def register_chat_socket(socketio):
    # Event: Register user to their private notification room (user_<id>)
    @socketio.on('join_user_notifications')
    def handle_user_notifications(data):
        token = data.get('token')
        user_id = verify_socket_token(token)
        if user_id:
            user_room = f"user_{user_id}"
            join_room(user_room)
            emit('user_registered', {'room': user_room})

    @socketio.on('join_booking_chat')
    def handle_join(data):
        token = data.get('token')
        booking_id = data.get('booking_id')
        user_id = verify_socket_token(token)

        if not user_id or not booking_id:
            emit('chat_error', {'message': 'Unauthorized or missing booking_id.'})
            return

        booking = Booking.query.get(booking_id)
        if not booking or (user_id != booking.customer_id and user_id != booking.provider_id):
            emit('chat_error', {'message': 'Not authorized to access this chat room.'})
            return

        room = f"booking_{booking_id}"
        join_room(room)
        emit('joined_room', {'message': f'Connected to live chat for booking #{booking_id}', 'room': room})

    @socketio.on('send_chat_message')
    def handle_send_message(data):
        token = data.get('token')
        booking_id = data.get('booking_id')
        content = data.get('content', '').strip()
        user_id = verify_socket_token(token)

        if not user_id or not booking_id or not content:
            emit('chat_error', {'message': 'Cannot send empty message or missing credentials.'})
            return

        booking = Booking.query.get(booking_id)
        if not booking or (user_id != booking.customer_id and user_id != booking.provider_id):
            emit('chat_error', {'message': 'Not authorized to send messages in this room.'})
            return

        receiver_id = booking.provider_id if user_id == booking.customer_id else booking.customer_id
        sender = User.query.get(user_id)

        try:
            msg = Message(
                sender_id=user_id,
                receiver_id=receiver_id,
                booking_id=booking.id,
                content=content,
                is_read=False
            )
            db.session.add(msg)
            db.session.commit()

            message_payload = {
                'id': msg.id,
                'booking_id': booking.id,
                'sender_id': user_id,
                'sender_name': sender.full_name if sender else 'User',
                'receiver_id': receiver_id,
                'content': msg.content,
                'sent_at': msg.sent_at.isoformat()
            }

            # 1. Broadcast inside active booking chat room
            emit('new_chat_message', message_payload, room=f"booking_{booking_id}")

            # 2. Push real-time notification alert to recipient's private user room
            emit('new_message_notification', {
                'booking_id': booking.id,
                'sender_name': sender.full_name if sender else 'User',
                'service_title': booking.service_title,
                'content': msg.content,
                'sent_at': msg.sent_at.isoformat()
            }, room=f"user_{receiver_id}")

        except Exception as e:
            db.session.rollback()
            emit('chat_error', {'message': f'Failed to store message: {str(e)}'})