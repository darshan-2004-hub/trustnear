from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
from config import Config
from models.schema_models import db
from routes.auth_routes import auth_bp
from routes.provider_routes import provider_bp
from routes.booking_routes import booking_bp
from routes.review_routes import review_bp
from routes.ai_routes import ai_bp
from routes.admin_routes import admin_bp
from sockets.chat_socket import register_chat_socket

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for frontend integration
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize SQLAlchemy
    db.init_app(app)

    # Initialize Real-time SocketIO
    socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(provider_bp, url_prefix='/api/providers')
    app.register_blueprint(booking_bp, url_prefix='/api/bookings')
    app.register_blueprint(review_bp, url_prefix='/api/reviews')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    # Register Real-time Chat Socket Events
    register_chat_socket(socketio)

    # Base Health Check Route
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'online',
            'service': 'TrustNear REST API',
            'database': 'Connected to MySQL trustnear_db'
        }), 200

    return app, socketio

app, socketio = create_app()

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)