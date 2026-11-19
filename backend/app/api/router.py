"""Root API router aggregating all versioned/prefixed route modules."""

from fastapi import APIRouter

from app.api.routes import auth, doctor, health, patient, roles

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(roles.router)
api_router.include_router(patient.router)
api_router.include_router(doctor.router)
