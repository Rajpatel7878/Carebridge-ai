"""Pydantic schemas for application and database health endpoints."""

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Standard application liveness/readiness response."""

    status: str
    application: str
    version: str


class DatabaseHealthResponse(BaseModel):
    """Database connectivity probe response."""

    status: str
    database: str
    dialect: str
    mode: str
    detail: str | None = None
