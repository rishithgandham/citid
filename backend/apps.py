from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from sqlalchemy import func

from schemas import (
    validate_create_app,
    validate_create_permission,
    validate_grant_permission,
    validate_grant_permission_bulk,
    validate_grant_permission_by_emails,
    validate_revoke_permission,
    validate_update_app,
)
from models import db, Users, Apps, Permissions, UserPermissions
from utils.audit import add_audit_log


apps_bp = Blueprint("apps", __name__)


def _request_user():
    uid = int(get_jwt_identity())
    return Users.query.get(uid)


def _is_platform_admin(user):
    """CIT ID platform operator (Users.app_admin), not per-SSO-app permissions."""
    return user is not None and bool(user.app_admin)


def _can_manage_app(user, app):
    if not user or not app:
        return False
    return user.app_admin or app.owner_id == user.id


"""
The create_app function allows a platform admin (Users.app_admin) to create a new external app (SSO app).
They may set owner_id to assign another user as owner; otherwise the new app is owned by the admin.
"""
@apps_bp.route("/create_app", methods=["POST"])
@jwt_required(locations=["cookies"])
def create_app():
    data = request.get_json() or {}

    validated_data, error_response = validate_create_app(data)
    if error_response:
        return error_response

    current_user = _request_user()
    if not current_user:
        return jsonify({"msg": "User not found"}), 404
    if not _is_platform_admin(current_user):
        return jsonify({"msg": "Forbidden: only platform administrators can create apps"}), 403

    name = validated_data.get("name")
    link = validated_data.get("link")
    requested_owner_id = validated_data.get("owner_id")

    if not name:
        return jsonify({"msg": "App name is required"}), 400

    owner = current_user
    if requested_owner_id is not None:
        candidate = Users.query.get(requested_owner_id)
        if candidate is not None:
            owner = candidate

    # Create the app and generate its client credentials
    app = Apps(name=name, owner_id=owner.id, link=link)
    app.generate_client_credentials()

    db.session.add(app)
    db.session.flush()
    add_audit_log(
        action="app_created",
        target_type="app",
        actor_user_id=current_user.id,
        target_id=app.id,
        details={"name": app.name, "owner_id": app.owner_id},
    )
    db.session.commit()

    return (
        jsonify(
            {
                "msg": "App created successfully",
                "app": {
                    "id": app.id,
                    "name": app.name,
                    "link": app.link,
                    "client_id": app.client_id,
                    "owner_id": app.owner_id,
                },
            }
        ),
        201,
    )


"""
The get_user_apps route returns apps the user can access via granted permissions.
One object per app; permissions is a sorted list of permission names.
No internal identifiers (client_id, owner_id), only app name, link, and permission names.
"""
@apps_bp.route("/get_user_apps", methods=["GET"])
@jwt_required(locations=["cookies"])
def get_user_apps():
    user_id = int(get_jwt_identity())

    # Ensure the user exists
    user = Users.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    rows = (
        db.session.query(
            Apps.id.label("app_id"),
            Apps.name.label("app"),
            Apps.link.label("link"),
            Permissions.name.label("permission"),
        )
        .join(UserPermissions, UserPermissions.app_id == Apps.id)
        .join(Permissions, Permissions.id == UserPermissions.permission_id)
        .filter(UserPermissions.user_id == user_id)
        .order_by(Apps.name, Permissions.name)
        .all()
    )

    by_app = {}
    for row in rows:
        aid = row.app_id
        if aid not in by_app:
            by_app[aid] = {
                "app": row.app,
                "link": row.link,
                "permissions": [],
            }
        by_app[aid]["permissions"].append(row.permission)

    result = sorted(by_app.values(), key=lambda x: (x["app"] or "").lower())

    return jsonify({"apps": result}), 200


"""
The get_owned_apps route returns all apps where the current user is the owner.
This is used for the Apps management page.
"""
@apps_bp.route("/get_owned_apps", methods=["GET"])
@jwt_required(locations=["cookies"])
def get_owned_apps():
    user = _request_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    if _is_platform_admin(user):
        apps = Apps.query.order_by(Apps.name).all()
        result = []
        for app in apps:
            row = {
                "id": app.id,
                "name": app.name,
                "link": app.link,
            }
            if app.owner:
                row["owner"] = {
                    "id": app.owner.id,
                    "email": app.owner.email,
                    "first_name": app.owner.first_name,
                    "last_name": app.owner.last_name,
                }
            result.append(row)
    else:
        apps = Apps.query.filter_by(owner_id=user.id).all()
        result = [
            {
                "id": app.id,
                "name": app.name,
                "link": app.link,
            }
            for app in apps
        ]

    return jsonify({"apps": result}), 200


@apps_bp.route("/admin/users", methods=["GET"])
@jwt_required(locations=["cookies"])
def list_users_for_admin():
    user = _request_user()
    if not user:
        return jsonify({"msg": "User not found"}), 404
    if not _is_platform_admin(user):
        return jsonify({"msg": "Forbidden"}), 403

    users = Users.query.order_by(Users.email).all()
    return (
        jsonify(
            {
                "users": [
                    {
                        "id": u.id,
                        "email": u.email,
                        "first_name": u.first_name,
                        "last_name": u.last_name,
                    }
                    for u in users
                ]
            }
        ),
        200,
    )


@apps_bp.route("/<int:app_id>", methods=["GET"])
@jwt_required(locations=["cookies"])
def get_owned_app(app_id):
    jwt_user = _request_user()
    app = Apps.query.get(app_id)
    if not app:
        return jsonify({"msg": "App not found"}), 404
    if not _can_manage_app(jwt_user, app):
        return jsonify({"msg": "Forbidden"}), 403

    app_payload = {
        "id": app.id,
        "name": app.name,
        "link": app.link,
        "owner_id": app.owner_id,
    }
    if app.owner:
        app_payload["owner"] = {
            "id": app.owner.id,
            "email": app.owner.email,
            "first_name": app.owner.first_name,
            "last_name": app.owner.last_name,
        }
    return jsonify({"app": app_payload}), 200


@apps_bp.route("/<int:app_id>", methods=["PUT"])
@jwt_required(locations=["cookies"])
def update_owned_app(app_id):
    jwt_user = _request_user()

    app = Apps.query.get(app_id)
    if not app:
        return jsonify({"msg": "App not found"}), 404
    if not _is_platform_admin(jwt_user):
        return jsonify({"msg": "Forbidden: only platform administrators can edit apps"}), 403

    data = request.get_json() or {}
    validated_data, error_response = validate_update_app(data)
    if error_response:
        return error_response

    proposed_owner_id = app.owner_id
    if "owner_id" in validated_data and validated_data.get("owner_id") is not None:
        new_owner = Users.query.get(validated_data["owner_id"])
        if not new_owner:
            return jsonify({"msg": "Owner user not found"}), 400
        proposed_owner_id = new_owner.id

    original_name = app.name
    original_link = app.link
    original_owner_id = app.owner_id

    proposed_name = validated_data["name"]
    proposed_link = validated_data.get("link", app.link)

    changes = {}
    if original_name != proposed_name:
        changes["name"] = {"from": original_name, "to": proposed_name}
    if original_link != proposed_link:
        changes["link"] = {"from": original_link, "to": proposed_link}
    if original_owner_id != proposed_owner_id:
        changes["owner_id"] = {"from": original_owner_id, "to": proposed_owner_id}

    app.name = proposed_name
    app.link = proposed_link
    app.owner_id = proposed_owner_id

    if changes:
        add_audit_log(
            action="app_updated",
            target_type="app",
            actor_user_id=jwt_user.id,
            target_id=app.id,
            details={"changes": changes},
        )
    db.session.commit()

    app_payload = {
        "id": app.id,
        "name": app.name,
        "link": app.link,
        "owner_id": app.owner_id,
    }
    if app.owner:
        app_payload["owner"] = {
            "id": app.owner.id,
            "email": app.owner.email,
            "first_name": app.owner.first_name,
            "last_name": app.owner.last_name,
        }
    return (
        jsonify({"msg": "App updated successfully", "app": app_payload}),
        200,
    )


@apps_bp.route("/<int:app_id>/client_id", methods=["GET"])
@jwt_required(locations=["cookies"])
def get_owned_client_id(app_id):
    jwt_user = _request_user()
    app = Apps.query.get(app_id)
    if not app:
        return jsonify({"msg": "App not found"}), 404
    if not _can_manage_app(jwt_user, app):
        return jsonify({"msg": "Forbidden"}), 403

    return jsonify({"client_id": app.client_id}), 200


@apps_bp.route("/<int:app_id>", methods=["DELETE"])
@jwt_required(locations=["cookies"])
def delete_owned_app(app_id):
    jwt_user = _request_user()
    app = Apps.query.get(app_id)
    if not app:
        return jsonify({"msg": "App not found"}), 404
    if not _is_platform_admin(jwt_user):
        return jsonify({"msg": "Forbidden: only platform administrators can delete apps"}), 403

    # Permissions are tied to apps, so remove related grant records + permissions first.
    app_permissions = Permissions.query.filter_by(app_id=app_id).all()
    permission_ids = [p.id for p in app_permissions]

    if permission_ids:
        UserPermissions.query.filter(UserPermissions.permission_id.in_(permission_ids)).delete(
            synchronize_session=False
        )
    Permissions.query.filter_by(app_id=app_id).delete(synchronize_session=False)

    add_audit_log(
        action="app_deleted",
        target_type="app",
        actor_user_id=jwt_user.id,
        target_id=app.id,
        details={"name": app.name},
    )
    db.session.delete(app)
    db.session.commit()

    return jsonify({"msg": "App deleted successfully"}), 200


"""
List permissions defined for an app (owner only).
"""
@apps_bp.route("/<int:app_id>/permissions", methods=["GET"])
@jwt_required(locations=["cookies"])
def list_owned_app_permissions(app_id):
    jwt_user = _request_user()
    app = Apps.query.get(app_id)
    if not app:
        return jsonify({"msg": "App not found"}), 404
    if not _can_manage_app(jwt_user, app):
        return jsonify({"msg": "Forbidden"}), 403

    rows = (
        Permissions.query.filter_by(app_id=app_id)
        .order_by(Permissions.name)
        .all()
    )
    return (
        jsonify(
            {
                "permissions": [
                    {"id": p.id, "name": p.name, "description": p.description}
                    for p in rows
                ]
            }
        ),
        200,
    )


@apps_bp.route("/<int:app_id>/permissions/grants", methods=["GET"])
@jwt_required(locations=["cookies"])
def list_owned_app_permission_grants(app_id):
    """
    All users who have at least one permission on this app, with the list of
    permission names per user. Owner only.
    """
    jwt_user = _request_user()
    app = Apps.query.get(app_id)
    if not app:
        return jsonify({"msg": "App not found"}), 404
    if not _can_manage_app(jwt_user, app):
        return jsonify({"msg": "Forbidden"}), 403

    rows = (
        db.session.query(Users, Permissions)
        .join(UserPermissions, UserPermissions.user_id == Users.id)
        .join(Permissions, Permissions.id == UserPermissions.permission_id)
        .filter(UserPermissions.app_id == app_id)
        .order_by(Users.email, Permissions.name)
        .all()
    )

    grouped = {}
    for user, perm in rows:
        if user.id not in grouped:
            grouped[user.id] = {
                "user_id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "permissions": [],
            }
        grouped[user.id]["permissions"].append(
            {"id": perm.id, "name": perm.name}
        )

    return jsonify({"users": list(grouped.values())}), 200


@apps_bp.route("/<int:app_id>/users/directory", methods=["GET"])
@jwt_required(locations=["cookies"])
def list_app_user_directory(app_id):
    """All registered users (for pickers). App owner or platform admin only."""
    jwt_user = _request_user()
    app = Apps.query.get(app_id)
    if not app:
        return jsonify({"msg": "App not found"}), 404
    if not _can_manage_app(jwt_user, app):
        return jsonify({"msg": "Forbidden"}), 403

    users = Users.query.order_by(Users.email).all()
    return (
        jsonify(
            {
                "users": [
                    {
                        "id": u.id,
                        "email": u.email,
                        "first_name": u.first_name,
                        "last_name": u.last_name,
                    }
                    for u in users
                ]
            }
        ),
        200,
    )


"""
The create_permission function allows creating a new permission that is tied
to a specific app. Each app can define its own permission names.
"""
@apps_bp.route("/<int:app_id>/permissions", methods=["POST"])
@jwt_required(locations=["cookies"])
def create_permission(app_id):
    data = request.get_json() or {}

    validated_data, error_response = validate_create_permission(data)
    if error_response:
        return error_response

    name = validated_data.get("name")
    description = validated_data.get("description")

    app = Apps.query.get(app_id)
    if not app:
        return jsonify({"msg": "App not found"}), 404
    
    jwt_user = _request_user()
    if not _can_manage_app(jwt_user, app):
        return jsonify({"msg": "Forbidden"}), 403

    # Ensure permission name is unique per app
    if Permissions.query.filter_by(name=name, app_id=app.id).first():
        return jsonify({"msg": "Permission with this name already exists for this app"}), 400

    permission = Permissions(name=name, description=description, app_id=app.id)
    db.session.add(permission)
    db.session.flush()
    add_audit_log(
        action="permission_created",
        target_type="permission",
        actor_user_id=jwt_user.id,
        target_id=permission.id,
        details={"app_id": app.id, "name": permission.name},
    )
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
@apps_bp.route("/<int:app_id>/permissions/grant", methods=["POST"])
@jwt_required(locations=["cookies"])
def grant_permission(app_id):
    data = request.get_json() or {}

    validated_data, error_response = validate_grant_permission(data)
    if error_response:
        return error_response

    user_id = validated_data.get("user_id")
    permission_id = validated_data.get("permission_id")

    # Validate referenced records
    app = Apps.query.get(app_id)
    if not app:
        return jsonify({"msg": "App not found"}), 404
    
    jwt_user = _request_user()
    if not _can_manage_app(jwt_user, app):
        return jsonify({"msg": "Forbidden"}), 403

    user = Users.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    permission = Permissions.query.get(permission_id)
    if not permission or permission.app_id != app.id:
        return jsonify({"msg": "Permission not found for this app"}), 404

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
    db.session.flush()
    add_audit_log(
        action="permission_granted",
        target_type="user_permission",
        actor_user_id=jwt_user.id,
        target_id=user_permission.id,
        details={
            "app_id": app.id,
            "user_id": user.id,
            "permission_id": permission.id,
        },
    )
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


@apps_bp.route("/<int:app_id>/permissions/grant_bulk", methods=["POST"])
@jwt_required(locations=["cookies"])
def grant_permission_bulk(app_id):
    """Grant one permission to many users by user id (owner or platform admin)."""
    data = request.get_json() or {}
    validated_data, error_response = validate_grant_permission_bulk(data)
    if error_response:
        return error_response

    permission_id = validated_data["permission_id"]
    raw_ids = validated_data["user_ids"]
    seen = set()
    user_ids = []
    for uid in raw_ids:
        if uid not in seen:
            seen.add(uid)
            user_ids.append(uid)

    app = Apps.query.get(app_id)
    if not app:
        return jsonify({"msg": "App not found"}), 404

    jwt_user = _request_user()
    if not _can_manage_app(jwt_user, app):
        return jsonify({"msg": "Forbidden"}), 403

    permission = Permissions.query.get(permission_id)
    if not permission or permission.app_id != app.id:
        return jsonify({"msg": "Permission not found for this app"}), 404

    granted = []
    not_found = []
    already_granted = []

    for user_id in user_ids:
        user = Users.query.get(user_id)
        if not user:
            not_found.append(user_id)
            continue
        existing = UserPermissions.query.filter_by(
            user_id=user.id, app_id=app.id, permission_id=permission.id
        ).first()
        if existing:
            already_granted.append(
                {"user_id": user.id, "email": user.email}
            )
            continue
        db.session.add(
            UserPermissions(
                user_id=user.id, app_id=app.id, permission_id=permission.id
            )
        )
        granted.append({"user_id": user.id, "email": user.email})

    add_audit_log(
        action="permission_granted_bulk",
        target_type="app_permission",
        actor_user_id=jwt_user.id,
        target_id=app.id,
        details={
            "app_id": app.id,
            "permission_id": permission.id,
            "granted_count": len(granted),
            "already_granted_count": len(already_granted),
            "not_found_count": len(not_found),
        },
    )
    db.session.commit()

    return (
        jsonify(
            {
                "msg": "Bulk grants processed",
                "granted": granted,
                "not_found": not_found,
                "already_granted": already_granted,
            }
        ),
        200,
    )


@apps_bp.route("/<int:app_id>/permissions/grant_by_emails", methods=["POST"])
@jwt_required(locations=["cookies"])
def grant_permission_by_emails(app_id):
    """Grant a permission to one or more users identified by email (owner only)."""
    data = request.get_json() or {}

    validated_data, error_response = validate_grant_permission_by_emails(data)
    if error_response:
        return error_response

    permission_id = validated_data["permission_id"]
    email_list = validated_data["email_list"]

    app = Apps.query.get(app_id)
    if not app:
        return jsonify({"msg": "App not found"}), 404

    jwt_user = _request_user()
    if not _can_manage_app(jwt_user, app):
        return jsonify({"msg": "Forbidden"}), 403

    permission = Permissions.query.get(permission_id)
    if not permission or permission.app_id != app.id:
        return jsonify({"msg": "Permission not found for this app"}), 404

    seen = set()
    unique_emails = []
    for e in email_list:
        if e not in seen:
            seen.add(e)
            unique_emails.append(e)

    granted = []
    not_found = []
    already_granted = []

    for email in unique_emails:
        user = Users.query.filter(func.lower(Users.email) == email).first()
        if not user:
            not_found.append(email)
            continue
        existing = UserPermissions.query.filter_by(
            user_id=user.id, app_id=app.id, permission_id=permission.id
        ).first()
        if existing:
            already_granted.append({"email": user.email, "user_id": user.id})
            continue
        user_permission = UserPermissions(
            user_id=user.id, app_id=app.id, permission_id=permission.id
        )
        db.session.add(user_permission)
        granted.append({"email": user.email, "user_id": user.id})

    add_audit_log(
        action="permission_granted_by_emails",
        target_type="app_permission",
        actor_user_id=jwt_user.id,
        target_id=app.id,
        details={
            "app_id": app.id,
            "permission_id": permission.id,
            "granted_count": len(granted),
            "already_granted_count": len(already_granted),
            "not_found_count": len(not_found),
        },
    )
    db.session.commit()

    return (
        jsonify(
            {
                "msg": "Permission grants processed",
                "granted": granted,
                "not_found": not_found,
                "already_granted": already_granted,
            }
        ),
        200,
    )


"""
The revoke_permission function removes a permission from a user for a specific app.
It deletes the corresponding UserPermissions record if it exists.
"""
@apps_bp.route("/<int:app_id>/permissions/revoke", methods=["DELETE"])
@jwt_required(locations=["cookies"])
def revoke_permission(app_id):
    data = request.get_json() or {}

    validated_data, error_response = validate_revoke_permission(data)
    if error_response:
        return error_response

    user_id = validated_data.get("user_id")
    permission_id = validated_data.get("permission_id")

    app = Apps.query.get(app_id)
    if not app:
        return jsonify({"msg": "App not found"}), 404
    
    jwt_user = _request_user()
    if not _can_manage_app(jwt_user, app):
        return jsonify({"msg": "Forbidden"}), 403

    user_permission = UserPermissions.query.filter_by(
        user_id=user_id, app_id=app_id, permission_id=permission_id
    ).first()

    if not user_permission:
        return jsonify({"msg": "Permission not found for this user and app"}), 404

    add_audit_log(
        action="permission_revoked",
        target_type="user_permission",
        actor_user_id=jwt_user.id,
        target_id=user_permission.id,
        details={
            "app_id": app.id,
            "user_id": user_id,
            "permission_id": permission_id,
        },
    )
    db.session.delete(user_permission)
    db.session.commit()

    return jsonify({"msg": "Permission revoked successfully"}), 200
