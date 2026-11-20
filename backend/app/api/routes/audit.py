"""Read-only administrator audit query."""
from datetime import UTC, date, datetime, time, timedelta
import json
from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.api.deps.auth import AdminUser
from app.database.session import get_db
from app.models.audit_log import AuditLog

router = APIRouter(prefix='/admin/audit-logs', tags=['Administrative audit'])


@router.get('')
def list_audit_logs(
    _admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
    action: str | None = Query(default=None, max_length=80),
    actor_id: str | None = Query(default=None, max_length=36),
    actor_role: str | None = Query(default=None, max_length=20),
    resource_type: str | None = Query(default=None, max_length=40),
    from_date: date | None = None,
    to_date: date | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> dict:
    conditions = []
    if action:
        # Escape SQL wildcard characters so search is literal.
        safe = action.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')
        conditions.append(AuditLog.action.ilike(f'%{safe}%', escape='\\'))
    if actor_id:
        conditions.append(AuditLog.actor_id == actor_id)
    if actor_role:
        conditions.append(AuditLog.actor_role == actor_role.upper())
    if resource_type:
        conditions.append(AuditLog.resource_type == resource_type.lower())
    if from_date:
        conditions.append(AuditLog.timestamp >= datetime.combine(from_date, time.min, UTC))
    if to_date:
        conditions.append(AuditLog.timestamp < datetime.combine(to_date + timedelta(days=1), time.min, UTC))
    total = db.scalar(select(func.count()).select_from(AuditLog).where(*conditions)) or 0
    rows = db.scalars(select(AuditLog).where(*conditions).order_by(AuditLog.timestamp.desc(), AuditLog.id.desc()).limit(limit).offset(offset)).all()
    return {'total': total, 'limit': limit, 'offset': offset, 'items': [
        {'id': row.id, 'actor_id': row.actor_id, 'actor_role': row.actor_role,
         'action': row.action, 'resource_type': row.resource_type, 'resource_id': row.resource_id,
         'timestamp': row.timestamp, 'outcome': row.outcome, 'metadata': json.loads(row.metadata_json)} for row in rows
    ]}
