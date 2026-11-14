# CareBridge AI 🏥

### From Early Screening to Timely Care — One Intelligent Platform.

CareBridge AI is a population-health MVP for closing the screening-to-care loop. It connects fictional patients, clinicians, and healthcare administrators through report review, explainable prioritization, referrals, appointments, and follow-up workflows.

**Built by Team ALPHA | Future Health Challenge**

## Repository status

The active implementation is being developed on `feature/carebridge-mvp`; `main` remains protected. The repository currently contains the foundation for the React/Vite frontend and FastAPI/SQLAlchemy backend. Feature work is being committed incrementally.

## Planned MVP capabilities

- AI-assisted medical report analysis with a clearly labeled mock fallback
- Explainable patient-risk prioritization
- Patient, doctor, and administrator workspaces
- Referrals, appointments, follow-ups, and in-app notifications
- Population-health analytics from database records
- English and Hindi patient-facing interface
- JWT authentication and role-based permissions
- PostgreSQL deployment with SQLite development fallback

## Development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
PYTHONPATH=. python -m app.database.init_db
uvicorn app.main:app --reload --port 8000
```

API health: http://localhost:8000/api/health  
Swagger: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

## Safety and demo data

Use fictional demonstration records only. AI output is assistive, must disclose uncertainty, and is not a diagnosis or a prescription. Clinical decisions must be made by qualified healthcare professionals. No claim of regulatory compliance is made by this hackathon MVP.
