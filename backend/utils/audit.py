import json

from models import AuditLog, db


def add_audit_log(action, target_type, actor_user_id=None, target_id=None, details=None):
    """
    Queue an API-level audit log entry in the current DB transaction.

    Args:
        action: Audit action label, e.g. "user_registered" or "app_deleted".
        target_type: Entity type affected by the action, e.g. "user", "app".
        actor_user_id: User who performed the action; can be None for system/anonymous events.
        target_id: Identifier of the affected entity.
        details: Optional structured metadata that will be serialized to JSON.
    """
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
