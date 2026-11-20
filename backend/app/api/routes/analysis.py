"""Patient-initiated analysis with explicit per-request external consent."""
import json
from datetime import UTC, datetime
from typing import Annotated, Literal
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.report_analysis import ExtractionError, gemini_analysis, mock_result
from app.ai.ocr import extract_document
from app.api.deps.auth import DoctorUser, PatientUser
from app.core.config import Settings, get_settings
from app.core.exceptions import BadRequestException
from app.database.session import get_db
from app.models.report_analysis import ReportAnalysis
from app.services.doctor import get_doctor_report_detail
from app.services.patient import get_patient_report, get_patient_report_for_download

router = APIRouter(tags=['Report analysis'])
Db = Annotated[Session, Depends(get_db)]
Config = Annotated[Settings, Depends(get_settings)]


class AnalysisRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    mode: Literal['SIMULATED', 'EXTERNAL'] = 'SIMULATED'
    external_consent: bool = False


def serialize(row: ReportAnalysis) -> dict:
    return {'id': row.id, 'report_id': row.report_id, 'provider': row.provider,
            'processing_mode': row.processing_mode, 'status': row.status,
            'external_consent': row.external_consent, 'failure_reason': row.failure_reason,
            'created_at': row.created_at, 'result': json.loads(row.result_json)}


def history(db: Session, report_id: str, limit: int, offset: int) -> dict:
    rows = db.scalars(select(ReportAnalysis).where(ReportAnalysis.report_id == report_id)
        .order_by(ReportAnalysis.created_at.desc(), ReportAnalysis.id.desc()).limit(limit).offset(offset)).all()
    return {'items': [serialize(row) for row in rows], 'limit': limit, 'offset': offset}


@router.post('/patient/reports/{report_id}/analyses', status_code=status.HTTP_201_CREATED)
def process_report(report_id: str, payload: AnalysisRequest, patient: PatientUser, db: Db, settings: Config) -> dict:
    report, path = get_patient_report_for_download(db, patient=patient, report_id=report_id, settings=settings)
    if payload.mode == 'EXTERNAL' and not payload.external_consent:
        raise BadRequestException('Explicit consent is required before sending report text to Gemini.', code='external_consent_required')
    provider, mode, processing_status = 'MOCK', 'SIMULATED', 'SIMULATED'
    failure_reason = None
    try:
        extracted = extract_document(path, report.file_type)
    except ExtractionError as exc:
        provider, mode, processing_status = 'LOCAL', 'EXTRACTION', 'FAILED'
        failure_reason = str(exc)
        result = mock_result(failure_reason)
        result['summary'] = 'Report text extraction failed. Please use the original report or retry.'
        result['limitations'] = [failure_reason, 'No analysis was generated.']
    else:
        result = mock_result('No external analysis was requested.')
        if payload.mode == 'EXTERNAL':
            if not settings.GEMINI_API_KEY.strip():
                failure_reason = 'External analysis is not configured.'
                result = mock_result(failure_reason)
            else:
                try:
                    result = gemini_analysis(extracted['text'], settings)
                    provider, mode, processing_status = 'GEMINI', 'EXTERNAL', 'COMPLETED'
                except Exception:
                    # Never expose SDK errors, which may contain report text or credentials.
                    failure_reason = 'External analysis unavailable or invalid; please retry later.'
                    result = mock_result(failure_reason)
        result['extraction'] = extracted
    row = ReportAnalysis(report_id=report.id, provider=provider, processing_mode=mode,
                         status=processing_status, external_consent=payload.external_consent,
                         result_json=json.dumps(result, ensure_ascii=False), failure_reason=failure_reason,
                         created_at=datetime.now(UTC))
    db.add(row)
    db.commit()
    db.refresh(row)
    return serialize(row)


@router.get('/patient/reports/{report_id}/analyses')
def patient_analysis_history(report_id: str, patient: PatientUser, db: Db,
                             limit: int = Query(default=20, ge=1, le=50), offset: int = Query(default=0, ge=0)) -> dict:
    get_patient_report(db, patient=patient, report_id=report_id)
    return history(db, report_id, limit, offset)


@router.get('/doctor/reports/{report_id}/analyses')
def doctor_analysis_history(report_id: str, doctor: DoctorUser, db: Db,
                            limit: int = Query(default=20, ge=1, le=50), offset: int = Query(default=0, ge=0)) -> dict:
    get_doctor_report_detail(db, doctor=doctor, report_id=report_id)
    return history(db, report_id, limit, offset)
