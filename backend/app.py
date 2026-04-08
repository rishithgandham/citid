from flask import Flask, jsonify
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from flask_cors import CORS
from flask_mail import Mail
from models import db, Users, RefreshToken
from auth import auth_bp
from apps import apps_bp
from admin_views import admin_bp
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

# Enable CORS with credentials support for frontend
CORS(app, origins=["http://localhost:5173", "http://identity.drhscit.test:5173", "http://identity.drhscit.org", "http://drhscit.org", 'http://drhscit.test:5173'], supports_credentials=True)

# Initialize the database and JWT manager
db.init_app(app)
jwt = JWTManager(app)

# Initialize the mail extension
mail = Mail(app)

# Registers the auth blueprint from auth.py
# Blueprint is a way to organize routes into separate files
app.register_blueprint(auth_bp, url_prefix="/auth")


# Register the apps blueprint from apps.py
app.register_blueprint(apps_bp, url_prefix="/apps")

# Platform administrator user management
app.register_blueprint(admin_bp, url_prefix="/admin")


# Dont know what is does, but creates the tables in the db before the first request
# with app.app_context():
#     db.drop_all()
#     db.create_all()


# Profile route that the frontend can access to validate login state
# JWT required decorator to ensure the validity of the JWT token
@app.route("/profile")
@jwt_required(locations=["cookies"])
def profile():
    user_id = int(get_jwt_identity())
    user = Users.query.get(user_id)
    return user.to_dict()


    
"""
The check_if_token_revoked function checks if the refresh token is revoked.
If it is revoked, it returns True, otherwise it returns False.
"""
@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload["jti"]
    token = RefreshToken.query.filter_by(jti=jti).first()
    return token is not None and token.revoked



if __name__ == "__main__":
    app.run(debug=True)
    
