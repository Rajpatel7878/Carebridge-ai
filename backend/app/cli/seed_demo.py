"""Seed a *fresh* local database with synthetic demo records, never production data.

This command refuses nonempty databases. For a reset, use a new dedicated database
and private upload directory as documented in README; it never deletes data.
"""
import os
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app.core.config import get_settings
from app.core.security import hash_password, validate_password_strength
from app.database.session import SessionLocal
from app.models import Appointment, DoctorProfile, FollowUp, MedicalReport, Notification, PatientDoctorAssignment, PatientProfile, Referral, User


def synthetic_pdf() -> bytes:
    text = b'BT /F1 18 Tf 50 750 Td (SYNTHETIC DEMONSTRATION ONLY) Tj 0 -30 Td /F1 12 Tf (No medical findings. Discuss this placeholder with a doctor.) Tj ET'
    objects = [
        b'<< /Type /Catalog /Pages 2 0 R >>',
        b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        b'<< /Length ' + str(len(text)).encode() + b' >>\nstream\n' + text + b'\nendstream',
    ]
    data = b'%PDF-1.4\n'; offsets = [0]
    for i, obj in enumerate(objects, 1):
        offsets.append(len(data)); data += f'{i} 0 obj\n'.encode() + obj + b'\nendobj\n'
    xref = len(data)
    data += f'xref\n0 {len(offsets)}\n'.encode() + b'0000000000 65535 f \n'
    data += b''.join(f'{offset:010} 00000 n \n'.encode() for offset in offsets[1:])
    return data + f'trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode()


def main() -> None:
    settings = get_settings()
    if settings.is_production or settings.database_dialect != 'sqlite':
        raise SystemExit('Demo seeding is restricted to a local development SQLite database.')
    password = os.environ.get('CAREBRIDGE_DEMO_PASSWORD', '')
    try:
        validate_password_strength(password)
    except ValueError as exc:
        raise SystemExit(f'Set CAREBRIDGE_DEMO_PASSWORD to a strong local-only password: {exc}') from exc
    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(User)):
            raise SystemExit('Database is not empty. Use a fresh dedicated demo database; no data was changed.')
        hashed = hash_password(password)
        admin = User(full_name='Synthetic Admin', email='admin@demo.example.org', hashed_password=hashed, role='ADMIN', is_verified=True)
        doctors = [User(full_name=f'Dr Synthetic {name}', email=f'doctor{i}@demo.example.org', hashed_password=hashed, role='DOCTOR', is_verified=True) for i, name in enumerate(['River', 'Lake', 'Hill'], 1)]
        patients = [User(full_name=f'Synthetic Patient {i:02}', email=f'patient{i}@demo.example.org', hashed_password=hashed, role='PATIENT', is_verified=True) for i in range(1, 11)]
        db.add_all([admin, *doctors, *patients]); db.flush()
        db.add_all([DoctorProfile(user_id=d.id, department=dept, specialization=dept, verification_status='VERIFIED') for d, dept in zip(doctors, ['General Medicine', 'Cardiology', 'Preventive Care'])])
        db.add_all([PatientProfile(user_id=p.id, city='Fictional City', state='Demo State') for p in patients])
        now = datetime.now(UTC)
        for i, p in enumerate(patients):
            doctor = doctors[i % 3]
            db.add(PatientDoctorAssignment(patient_id=p.id, doctor_id=doctor.id, assigned_by=admin.id, status='ACTIVE', notes='Synthetic demo assignment'))
            db.add(Notification(user_id=p.id, title='Synthetic demo account', message='This account and all its data are fictional.', notification_type='SYSTEM'))
            if i < 5:
                db.add(Appointment(patient_id=p.id, doctor_id=doctor.id, scheduled_at=now + timedelta(days=i+2), appointment_type='GENERAL_CONSULTATION', status='PENDING', notes='Synthetic internal appointment'))
                db.add(Referral(patient_id=p.id, referring_doctor_id=doctor.id, referred_department='General Medicine', reason='Synthetic coordination example', status='PENDING'))
                db.add(FollowUp(patient_id=p.id, created_by_doctor_id=doctor.id, scheduled_at=now + timedelta(days=i+10), follow_up_type='Synthetic follow-up', notes='Fictional example only.', status='PENDING'))
        upload_dir = settings.resolved_upload_dir
        upload_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
        written = []
        try:
            for patient in patients[:3]:
                filename = uuid.uuid4().hex + '.pdf'
                path = upload_dir / filename
                fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                content = synthetic_pdf()
                with os.fdopen(fd, 'wb') as file:
                    file.write(content)
                written.append(path)
                db.add(MedicalReport(patient_id=patient.id, original_filename='synthetic-demo-report.pdf', stored_filename=filename, file_type='PDF', file_size=len(content)))
            db.commit()
        except Exception:
            db.rollback()
            for path in written:
                path.unlink(missing_ok=True)
            raise
    print('Seeded synthetic-only demo: admin@demo.example.org, doctor1@demo.example.org, patient1@demo.example.org. Password is CAREBRIDGE_DEMO_PASSWORD.')


if __name__ == '__main__':
    main()
