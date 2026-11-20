"""Non-clinical, rules-based attention signals; no medical thresholds or scores."""
from datetime import UTC, datetime
import hashlib
import json
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.models.follow_up import FollowUp
from app.models.medical_report import MedicalReport
from app.models.priority_assessment import PriorityAssessment
from app.models.user import User
from app.services.audit import record_audit

VERSION = 'workflow-v1'
DISCLAIMER = 'Priority indicates workflow attention, not a diagnosis or validated prediction.'


def signals(db: Session, patient_id: str) -> dict:
    def count(model, *conditions):
        return db.scalar(select(func.count()).select_from(model).where(*conditions)) or 0
    return {
        'flagged_reports': count(MedicalReport, MedicalReport.patient_id == patient_id, MedicalReport.review_status == 'NEEDS_FOLLOW_UP'),
        'pending_reports': count(MedicalReport, MedicalReport.patient_id == patient_id, MedicalReport.review_status.in_(['PENDING_REVIEW', 'IN_REVIEW'])),
        'overdue_follow_ups': count(FollowUp, FollowUp.patient_id == patient_id, FollowUp.status == 'PENDING', FollowUp.scheduled_at < datetime.now(UTC)),
    }


def fingerprint(values: dict) -> str:
    return hashlib.sha256(json.dumps({'version': VERSION, **values}, sort_keys=True).encode()).hexdigest()


def latest(db: Session, patient_id: str) -> PriorityAssessment | None:
    return db.scalar(select(PriorityAssessment).where(PriorityAssessment.patient_id == patient_id)
        .order_by(PriorityAssessment.created_at.desc(), PriorityAssessment.id.desc()).limit(1))


def serialize(item: PriorityAssessment, current_signals: dict | None = None) -> dict:
    return {'id': item.id, 'patient_id': item.patient_id, 'category': item.category,
            'reasons': json.loads(item.reasons_json), 'explanation': item.explanation,
            'recommended_action': item.recommended_action, 'assessment_version': item.assessment_version,
            'review_status': item.review_status, 'override_reason': item.override_reason,
            'created_at': item.created_at, 'stale': current_signals is not None and item.input_hash != fingerprint(current_signals),
            'disclaimer': DISCLAIMER}


def recalculate(db: Session, *, patient_id: str, doctor: User) -> PriorityAssessment:
    current = signals(db, patient_id)
    digest = fingerprint(current)
    previous = latest(db, patient_id)
    if previous and previous.input_hash == digest:
        record_audit(db, actor=doctor, action='priority.recalculated', resource_type='priority_assessment', resource_id=previous.id, metadata={'category': previous.category, 'changed': False})
        db.commit()
        return previous
    reasons = []
    if current['flagged_reports']:
        reasons.append({'source': 'report_review_status', 'detail': f"{current['flagged_reports']} report(s) marked as needing follow-up."})
    if current['overdue_follow_ups']:
        reasons.append({'source': 'follow_up_due_date', 'detail': f"{current['overdue_follow_ups']} pending follow-up(s) past due."})
    if current['pending_reports']:
        reasons.append({'source': 'report_review_status', 'detail': f"{current['pending_reports']} report(s) awaiting or undergoing review."})
    if current['flagged_reports'] and current['overdue_follow_ups']:
        category = 'URGENT_REVIEW'
    elif current['flagged_reports']:
        category = 'HIGH'
    elif current['overdue_follow_ups'] or current['pending_reports']:
        category = 'MODERATE'
    else:
        category = 'LOW'
        reasons.append({'source': 'workflow_records', 'detail': 'No tracked workflow flags were found; missing information is not assessed.'})
    item = PriorityAssessment(patient_id=patient_id, doctor_id=doctor.id, category=category, input_hash=digest,
        reasons_json=json.dumps(reasons), explanation='Rule-based coordination based on available workflow records only.',
        recommended_action='Review the care coordination queue and the original records.', assessment_version=VERSION,
        review_status='PENDING', created_at=datetime.now(UTC))
    db.add(item)
    db.flush()
    record_audit(db, actor=doctor, action='priority.recalculated', resource_type='priority_assessment', resource_id=item.id, metadata={'category': category, 'changed': True})
    db.commit()
    db.refresh(item)
    return item


def override(db: Session, *, patient_id: str, doctor: User, category: str, reason: str) -> PriorityAssessment:
    base = latest(db, patient_id)
    if not base or base.input_hash != fingerprint(signals(db, patient_id)):
        base = recalculate(db, patient_id=patient_id, doctor=doctor)
    item = PriorityAssessment(patient_id=patient_id, doctor_id=doctor.id, category=category,
        input_hash=base.input_hash, reasons_json=base.reasons_json, explanation='Operational priority overridden by an assigned clinician.',
        recommended_action='Review the care coordination queue and original records.', assessment_version=VERSION,
        review_status='OVERRIDDEN', override_reason=reason, created_at=datetime.now(UTC))
    db.add(item)
    db.flush()
    record_audit(db, actor=doctor, action='priority.overridden', resource_type='priority_assessment', resource_id=item.id,
                 metadata={'category': category})
    db.commit()
    db.refresh(item)
    return item
