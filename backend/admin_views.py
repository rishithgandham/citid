from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, Users
from schemas import validate_patch_user_admin
from utils.audit import add_audit_log


admin_bp = Blueprint("admin", __name__)


def _request_user():
    uid = int(get_jwt_identity())
    return Users.query.get(uid)


def _require_platform_admin():
    user = _request_user()
    if not user:
        return None, (jsonify({"msg": "User not found"}), 404)
    if not user.app_admin:
        return None, (jsonify({"msg": "Forbidden"}), 403)
    return user, None


@admin_bp.route("/users", methods=["GET"])
@jwt_required(locations=["cookies"])
def list_all_users():
    """Full user roster for platform administrators (no password fields)."""
    _, err = _require_platform_admin()
    if err:
        return err

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
                        "created_at": u.created_at.isoformat() if u.created_at else None,
                        "app_admin": bool(u.app_admin),
                        "email_verified": bool(u.email_verified),
                    }
                    for u in users
                ]
            }
        ),
        200,
    )


@admin_bp.route("/users/<int:user_id>", methods=["PATCH"])
@jwt_required(locations=["cookies"])
def patch_user_admin_flags(user_id):
    """Set platform admin (app_admin) flag for a user."""
    admin_user, err = _require_platform_admin()
    if err:
        return err

    target = Users.query.get(user_id)
    if not target:
        return jsonify({"msg": "User not found"}), 404

    data = request.get_json() or {}
    validated_data, error_response = validate_patch_user_admin(data)
    if error_response:
        return error_response

    want_admin = validated_data["app_admin"]

    if not want_admin and target.app_admin:
        other_admins = (
            Users.query.filter(Users.app_admin.is_(True), Users.id != target.id).count()
        )
        if other_admins < 1:
            return (
                jsonify(
                    {
                        "msg": "Cannot remove the last platform administrator",
                    }
                ),
                400,
            )

    target.app_admin = want_admin
    add_audit_log(
        action="platform_admin_flag_updated",
        target_type="user",
        actor_user_id=admin_user.id,
        target_id=target.id,
        details={"app_admin": bool(target.app_admin)},
    )
    db.session.commit()

    return (
        jsonify(
            {
                "msg": "User updated",
                "user": {
                    "id": target.id,
                    "email": target.email,
                    "first_name": target.first_name,
                    "last_name": target.last_name,
                    "created_at": target.created_at.isoformat()
                    if target.created_at
                    else None,
                    "app_admin": bool(target.app_admin),
                    "email_verified": bool(target.email_verified),
                },
            }
        ),
        200,
    )
