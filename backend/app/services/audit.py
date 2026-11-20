"""Append minimal audit events in the caller's transaction."""
import json
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.models.user import User


def record_audit(db: Session, *, actor: User, action: str, resource_type: str, resource_id: str, metadata: dict | None = None, outcome: str = "SUCCESS") -> None:
    # Callers supply only explicitly allowlisted, non-clinical metadata.
    db.add(AuditLog(actor_id=actor.id, actor_role=actor.role, action=action,
                    resource_type=resource_type, resource_id=resource_id,
                    outcome=outcome, metadata_json=json.dumps(metadata or {}, sort_keys=True)))
