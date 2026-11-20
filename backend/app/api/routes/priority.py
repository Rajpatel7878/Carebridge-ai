"""Operational priority endpoints; strictly scoped to assigned doctors."""
from typing import Annotated, Literal
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.deps.auth import AdminUser, DoctorUser, PatientUser
from app.database.session import get_db
from app.core.exceptions import AppException
from app.services.audit import record_audit
from app.models.patient_doctor_assignment import PatientDoctorAssignment
from app.models.priority_assessment import PriorityAssessment
from app.services.doctor import require_authorized_patient
from app.services.priority import fingerprint, latest, override, recalculate, serialize, signals

router = APIRouter(tags=['Operational priority'])
Db = Annotated[Session, Depends(get_db)]


class OverrideRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    category: Literal['LOW', 'MODERATE', 'HIGH', 'URGENT_REVIEW']
    reason: str = Field(min_length=5, max_length=500)

    @field_validator('reason')
    @classmethod
    def clean_reason(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 5:
            raise ValueError('A reason of at least five characters is required.')
        return value


@router.get('/doctor/priority')
def queue(doctor: DoctorUser, db: Db, category: Literal['LOW', 'MODERATE', 'HIGH', 'URGENT_REVIEW'] | None = None,
          limit: int = Query(default=50, ge=1, le=100), offset: int = Query(default=0, ge=0)) -> dict:
    assignments = db.scalars(select(PatientDoctorAssignment).where(PatientDoctorAssignment.doctor_id == doctor.id,
        PatientDoctorAssignment.status == 'ACTIVE').order_by(PatientDoctorAssignment.assigned_at.desc())).all()
    items = []
    for assignment in assignments:
        if not assignment.patient.is_active or assignment.patient.role != 'PATIENT':
            continue
        item = latest(db, assignment.patient_id)
        if item and category and item.category != category:
            continue
        if not item and category:
            continue
        items.append({'patient_id': assignment.patient_id, 'patient_name': assignment.patient.full_name,
                      'assessment': serialize(item, signals(db, assignment.patient_id)) if item else None})
    return {'items': items[offset:offset + limit], 'total': len(items), 'limit': limit, 'offset': offset}


@router.post('/doctor/patients/{patient_id}/priority/recalculate')
def update_priority(patient_id: str, doctor: DoctorUser, db: Db) -> dict:
    try:
        require_authorized_patient(db, doctor=doctor, patient_id=patient_id)
        return serialize(recalculate(db, patient_id=patient_id, doctor=doctor))
    except AppException as exc:
        db.rollback()
        record_audit(db, actor=doctor, action='priority.recalculate_failed', resource_type='patient', resource_id=patient_id[:36], outcome='FAILURE', metadata={'code': exc.code})
        db.commit()
        raise


@router.post('/doctor/patients/{patient_id}/priority/override')
def override_priority(patient_id: str, payload: OverrideRequest, doctor: DoctorUser, db: Db) -> dict:
    try:
        require_authorized_patient(db, doctor=doctor, patient_id=patient_id)
        return serialize(override(db, patient_id=patient_id, doctor=doctor, category=payload.category, reason=payload.reason))
    except AppException as exc:
        db.rollback()
        record_audit(db, actor=doctor, action='priority.override_failed', resource_type='patient', resource_id=patient_id[:36], outcome='FAILURE', metadata={'code': exc.code})
        db.commit()
        raise


@router.get('/doctor/patients/{patient_id}/priority/history')
def priority_history(patient_id: str, doctor: DoctorUser, db: Db, limit: int = Query(default=20, ge=1, le=100), offset: int = Query(default=0, ge=0)) -> dict:
    require_authorized_patient(db, doctor=doctor, patient_id=patient_id)
    rows = db.scalars(select(PriorityAssessment).where(PriorityAssessment.patient_id == patient_id).order_by(PriorityAssessment.created_at.desc(), PriorityAssessment.id.desc()).limit(limit).offset(offset)).all()
    return {'items': [serialize(row) for row in rows]}


@router.get('/patient/priority')
def patient_priority(patient: PatientUser, db: Db) -> dict:
    item = latest(db, patient.id)
    return {'available': item is not None, 'message': 'Your care team can review your coordination needs. This is not a diagnosis.', 'stale': bool(item and item.input_hash != fingerprint(signals(db, patient.id)))}


@router.get('/admin/priority')
def admin_priority(_admin: AdminUser, db: Db) -> dict:
    # Count latest saved assessment per patient; no personal data leaves this endpoint.
    rows = db.scalars(select(PriorityAssessment).order_by(PriorityAssessment.created_at.desc(), PriorityAssessment.id.desc())).all()
    seen = set()
    counts = {key: 0 for key in ('LOW', 'MODERATE', 'HIGH', 'URGENT_REVIEW')}
    for row in rows:
        if row.patient_id not in seen:
            counts[row.category] += 1
            seen.add(row.patient_id)
    return {'counts': counts, 'assessed_patients': len(seen), 'note': 'Latest saved assessments; may be stale. Workflow attention is not a diagnosis.'}
