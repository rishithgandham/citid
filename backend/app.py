from pathlib import Path

from flask import Flask, jsonify, make_response, request, send_from_directory
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from flask_cors import CORS
from flask_mail import Mail
from models import db, Users, RefreshToken
from auth import auth_bp
from apps import apps_bp
from admin_views import admin_bp
from config import Config

# Browser origins allowed to call this API with credentials (no env — edit here if you add hosts).
_ALLOWED_ORIGINS = frozenset(
    {
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://identity.drhscit.test:5173",
        "http://drhscit.test:5173",
        "http://identity.drhscit.org",
        "http://drhscit.org",
    }
)

# Find the path to the frontend dist folder (where react is built)
_BACKEND_DIR = Path(__file__).resolve().parent
_FRONTEND_DIST = _BACKEND_DIR.parent / "frontend" / "dist"

app = Flask(
    __name__,
    static_folder=str(_FRONTEND_DIST),
    static_url_path="/",
)
app.config.from_object(Config)


# @app.before_request
# def _answer_cors_preflight():
#     """Short-circuit OPTIONS so preflight never depends on routing, static files, or JWT."""
#     if request.method != "OPTIONS":
#         return None
#     origin = request.headers.get("Origin")
#     if not origin or origin not in _ALLOWED_ORIGINS:
#         return None
#     resp = make_response("", 204)
#     resp.headers["Access-Control-Allow-Origin"] = origin
#     resp.headers["Access-Control-Allow-Credentials"] = "true"
#     resp.headers["Access-Control-Allow-Methods"] = "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT"
#     req_headers = request.headers.get("Access-Control-Request-Headers")
#     if req_headers:
#         resp.headers["Access-Control-Allow-Headers"] = req_headers
#     resp.headers["Access-Control-Max-Age"] = "86400"
#     return resp


# @app.after_request
# def _cors_if_missing(response):
#     """Flask-CORS normally handles this; this fills in ACAO if something else skipped it."""
#     if response.headers.get("Access-Control-Allow-Origin"):
#         return response
#     origin = request.headers.get("Origin")
#     if origin and origin in _ALLOWED_ORIGINS:
#         response.headers["Access-Control-Allow-Origin"] = origin
#         response.headers["Access-Control-Allow-Credentials"] = "true"
#         if request.method == "OPTIONS":
#             response.headers["Access-Control-Allow-Methods"] = "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT"
#             req_headers = request.headers.get("Access-Control-Request-Headers")
#             if req_headers:
#                 response.headers["Access-Control-Allow-Headers"] = req_headers
#     return response


CORS(app, origins=list(_ALLOWED_ORIGINS), supports_credentials=True)

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


# SERVE REACT VITE APP FROM BACKEND FLASK
@app.route("/")
def index():
    return send_from_directory(_FRONTEND_DIST, "index.html")


# Apply CORS after routes exist (avoids edge cases with static / catch-all ordering).
CORS(app, origins=list(_ALLOWED_ORIGINS), supports_credentials=True)

# creates the tables in the db before the first request
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
    
