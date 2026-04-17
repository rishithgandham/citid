import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone
db = SQLAlchemy()

class Users(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(120), nullable=False)
    last_name = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    app_admin = db.Column(db.Boolean, default=False)
    email_verified = db.Column(db.Boolean, default=False)
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "app_admin": self.app_admin,
            "email_verified": self.email_verified,
        }


class RefreshToken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    revoked = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))

    user = db.relationship("Users", backref="refresh_tokens")
    
    
# For External Apps Models

import secrets

class Apps(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    link = db.Column(db.String(255), nullable=True)

    # public identifier used by apps
    client_id = db.Column(db.String(120), unique=True, nullable=False, index=True)

    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))

    owner = db.relationship("Users", backref="apps")

    def generate_client_credentials(self):
        self.client_id = "app_" + secrets.token_urlsafe(16)


    
class Permissions(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    app_id = db.Column(db.Integer, db.ForeignKey("apps.id"), nullable=False)

    name = db.Column(db.String(120), nullable=False)

    description = db.Column(db.String(255), nullable=True)

    app = db.relationship("Apps", backref="permissions")


class UserPermissions(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    app_id = db.Column(db.Integer, db.ForeignKey("apps.id"), nullable=False)

    permission_id = db.Column(db.Integer, db.ForeignKey("permissions.id"), nullable=False)

    granted_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))

    user = db.relationship("Users", backref="user_permissions")
    app = db.relationship("Apps")
    permission = db.relationship("Permissions")


class AuditLog(db.Model):
    timestamp = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    eventType = db.Column(db.String(255))
    description = db.Column(db.String(255))
    userID = db.Column(db.Integer, nullable=True)
    userEmail = db.Column(db.String(256), nullable=True)
    #These three are currently not used. 
    impactID = db.Column(db.Integer, nullable=True)
    impactEmail = db.Column(db.String(256), nullable=True)
    ipAddress = db.Column(db.String(40), nullable=True)