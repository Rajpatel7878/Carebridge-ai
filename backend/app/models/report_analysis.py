"""Append-only patient-consented report-processing attempts."""
from datetime import datetime
import uuid
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base


class ReportAnalysis(Base):
    __tablename__ = 'report_analyses'
    __table_args__ = (Index('ix_report_analyses_report_created', 'report_id', 'created_at'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id: Mapped[str] = mapped_column(String(36), ForeignKey('medical_reports.id', ondelete='CASCADE'), nullable=False)
    provider: Mapped[str] = mapped_column(String(20), nullable=False)
    processing_mode: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    external_consent: Mapped[bool] = mapped_column(Boolean, nullable=False)
    result_json: Mapped[str] = mapped_column(Text, nullable=False)
    failure_reason: Mapped[str | None] = mapped_column(String(250), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
