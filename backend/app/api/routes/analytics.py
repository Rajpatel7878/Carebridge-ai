"""Administrator-only, aggregate operational reporting; no patient-level exports."""
from datetime import UTC, datetime, timedelta
import csv
import io
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps.auth import AdminUser
from app.database.session import get_db
from app.models import Appointment, FollowUp, MedicalReport, Referral, RiskAssessment, User

router = APIRouter(prefix="/admin/analytics", tags=["Admin analytics"])
Db = Annotated[Session, Depends(get_db)]
def reporting_period(days: int = Query(default=30)) -> int:
    if days not in (7, 30, 90):
        raise HTTPException(status_code=422, detail="days must be 7, 30 or 90")
    return days


Period = Annotated[int, Depends(reporting_period)]


def aggregate(db: Session, days: int) -> dict:
    now = datetime.now(UTC)
    start = now - timedelta(days=days)

    def count(model, *conditions):
        return db.scalar(select(func.count()).select_from(model).where(*conditions)) or 0

    def groups(model, column, timestamp):
        rows = db.execute(
            select(column, func.count()).where(timestamp >= start, timestamp <= now).group_by(column)
        ).all()
        # Values are controlled enum fields; no names or clinical details are exported.
        return [{"category": key or "UNKNOWN", "count": value} for key, value in rows]

    def daily(model, timestamp, *conditions):
        rows = db.execute(
            select(func.date(timestamp), func.count())
            .where(timestamp >= start, timestamp <= now, *conditions)
            .group_by(func.date(timestamp))
        ).all()
        return {str(day): value for day, value in rows}

    registrations = daily(User, User.created_at, User.role == "PATIENT")
    uploads = daily(MedicalReport, MedicalReport.uploaded_at)
    timeline = []
    # UTC calendar days are explicit; start/end are rolling boundaries.
    for offset in range(days, -1, -1):
        day = (now - timedelta(days=offset)).date().isoformat()
        timeline.append({"date": day, "registrations": registrations.get(day, 0), "reports": uploads.get(day, 0)})

    return {
        "days": days,
        "start": start.isoformat(),
        "end": now.isoformat(),
        "totals": {
            "patients": count(User, User.role == "PATIENT"),
            "doctors": count(User, User.role == "DOCTOR"),
            "approved_doctors": count(User, User.role == "DOCTOR", User.is_verified.is_(True), User.is_active.is_(True)),
            "pending_verifications": count(User, User.requested_role == "DOCTOR"),
            "reports": count(MedicalReport),
            "reports_awaiting_review": count(MedicalReport, MedicalReport.review_status.in_(["PENDING_REVIEW", "IN_REVIEW"])),
            "appointments": count(Appointment),
            "pending_appointments": count(Appointment, Appointment.status == "PENDING"),
            "referrals": count(Referral),
            "pending_referrals": count(Referral, Referral.status == "PENDING"),
            "follow_ups": count(FollowUp),
            "pending_follow_ups": count(FollowUp, FollowUp.status == "PENDING"),
        },
        "timeline": timeline,
        "appointments": groups(Appointment, Appointment.status, Appointment.created_at),
        "referrals": groups(Referral, Referral.status, Referral.created_at),
        "follow_ups": groups(FollowUp, FollowUp.status, FollowUp.created_at),
        "risk_assessments": groups(RiskAssessment, RiskAssessment.risk_category, RiskAssessment.assessed_at),
    }


@router.get("")
def analytics(_admin: AdminUser, db: Db, days: Period) -> dict:
    """Return aggregate data; totals are all-time and distributions use the selected period."""
    return aggregate(db, days)


@router.get("/export")
def export_analytics(_admin: AdminUser, db: Db, days: Period) -> Response:
    """Export only fixed labels and integer aggregate counts, not patient records."""
    result = aggregate(db, days)
    stream = io.StringIO(newline="")
    writer = csv.writer(stream)
    writer.writerow(["scope", "metric", "count"])
    for key, value in result["totals"].items():
        writer.writerow(["all_time", key, value])
    for key in ("appointments", "referrals", "follow_ups", "risk_assessments"):
        for row in result[key]:
            # Prevent spreadsheet formula execution even if a future category is free text.
            label = str(row["category"])
            if label.startswith(("=", "+", "-", "@", "\t", "\r")):
                label = "'" + label
            writer.writerow([key, label, row["count"]])
    return Response(stream.getvalue(), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="carebridge-aggregate-{days}d.csv"', "Cache-Control": "no-store"})
