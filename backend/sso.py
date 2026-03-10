from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, Users, Apps, Permissions, UserPermissions


sso_bp = Blueprint("sso", __name__)


"""
The create_app function allows an authenticated user to create a new external app (SSO app).
The current user becomes the owner of the app, and a client_id is generated for the app.
"""
@sso_bp.route("/apps", methods=["POST"])
@jwt_required(locations=["cookies"])
def create_app():
    data = request.get_json() or {}

    name = data.get("name")

    if not name:
        return jsonify({"msg": "App name is required"}), 400

    # Get the current authenticated user as the app owner
    owner_id = get_jwt_identity()
    owner = Users.query.get(owner_id)
    if not owner:
        return jsonify({"msg": "Owner not found"}), 404

    # Create the app and generate its client credentials
    app = Apps(name=name, owner_id=owner.id)
    app.generate_client_credentials()

    db.session.add(app)
    db.session.commit()

    return (
        jsonify(
            {
                "msg": "App created successfully",
                "app": {
                    "id": app.id,
                    "name": app.name,
                    "client_id": app.client_id,
                    "owner_id": app.owner_id,
                },
            }
        ),
        201,
    )


"""
The create_permission function allows creating a new permission that can be used by apps.
Permissions are global (not tied to a specific app) and referenced when assigning them to users for an app.
"""
@sso_bp.route("/permissions", methods=["POST"])
@jwt_required(locations=["cookies"])
def create_permission():
    data = request.get_json() or {}

    name = data.get("name")
    description = data.get("description")

    if not name:
        return jsonify({"msg": "Permission name is required"}), 400

    # Ensure permission name is unique
    if Permissions.query.filter_by(name=name).first():
        return jsonify({"msg": "Permission with this name already exists"}), 400

    permission = Permissions(name=name, description=description)
    db.session.add(permission)
    db.session.commit()

    return (
        jsonify(
            {
                "msg": "Permission created successfully",
                "permission": {
                    "id": permission.id,
                    "name": permission.name,
                    "description": permission.description,
                },
            }
        ),
        201,
    )


"""
The grant_permission function assigns a permission to a user for a specific app.
It creates a UserPermissions record linking the user, app, and permission together.
"""
@sso_bp.route("/apps/<int:app_id>/permissions", methods=["POST"])
@jwt_required(locations=["cookies"])
def grant_permission(app_id):
    data = request.get_json() or {}

    user_id = data.get("user_id")
    permission_id = data.get("permission_id")

    if not user_id or not permission_id:
        return jsonify({"msg": "user_id and permission_id are required"}), 400

    # Validate referenced records
    app = Apps.query.get(app_id)
    if not app:
        return jsonify({"msg": "App not found"}), 404

    user = Users.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    permission = Permissions.query.get(permission_id)
    if not permission:
        return jsonify({"msg": "Permission not found"}), 404

    # Check if permission is already granted
    existing = UserPermissions.query.filter_by(
        user_id=user.id, app_id=app.id, permission_id=permission.id
    ).first()
    if existing:
        return jsonify({"msg": "Permission already granted for this user and app"}), 400

    user_permission = UserPermissions(
        user_id=user.id, app_id=app.id, permission_id=permission.id
    )
    db.session.add(user_permission)
    db.session.commit()

    return (
        jsonify(
            {
                "msg": "Permission granted successfully",
                "user_permission": {
                    "id": user_permission.id,
                    "user_id": user_permission.user_id,
                    "app_id": user_permission.app_id,
                    "permission_id": user_permission.permission_id,
                },
            }
        ),
        201,
    )


"""
The revoke_permission function removes a permission from a user for a specific app.
It deletes the corresponding UserPermissions record if it exists.
"""
@sso_bp.route("/apps/<int:app_id>/permissions", methods=["DELETE"])
@jwt_required(locations=["cookies"])
def revoke_permission(app_id):
    data = request.get_json() or {}

    user_id = data.get("user_id")
    permission_id = data.get("permission_id")

    if not user_id or not permission_id:
        return jsonify({"msg": "user_id and permission_id are required"}), 400

    app = Apps.query.get(app_id)
    if not app:
        return jsonify({"msg": "App not found"}), 404

    user_permission = UserPermissions.query.filter_by(
        user_id=user_id, app_id=app_id, permission_id=permission_id
    ).first()

    if not user_permission:
        return jsonify({"msg": "Permission not found for this user and app"}), 404

    db.session.delete(user_permission)
    db.session.commit()

    return jsonify({"msg": "Permission revoked successfully"}), 200

