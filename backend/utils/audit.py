import json

from models import AuditLog, db


def add_audit_log(action, target_type, actor_user_id=None, target_id=None, details=None):
    serialized_details = None
    if details is not None:
        serialized_details = json.dumps(details, default=str)

    db.session.add(
        AuditLog(
            actor_user_id=actor_user_id,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            details=serialized_details,
        )
    )
