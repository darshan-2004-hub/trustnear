import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from werkzeug.security import generate_password_hash
from app import create_app
from models.schema_models import db, User

app, _ = create_app()

def seed_admin():
    with app.app_context():
        admin_email = "admin@trustnear.com"
        existing = User.query.filter_by(email=admin_email).first()

        if existing:
            print(f"[Admin Seed] Admin account already exists: {admin_email}")
            return

        admin_user = User(
            full_name="System Administrator",
            email=admin_email,
            password_hash=generate_password_hash("AdminPass123", method='scrypt'),
            role='admin',
            phone="+919999999999"
        )
        db.session.add(admin_user)
        db.session.commit()
        print(f"[Admin Seed] Successfully created Admin account: {admin_email} (Password: AdminPass123)")

if __name__ == '__main__':
    seed_admin()