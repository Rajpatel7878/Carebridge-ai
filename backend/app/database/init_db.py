from app.database.session import Base, engine
from app.models import User, AuditLog


def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db()
    print("CareBridge database initialized")
