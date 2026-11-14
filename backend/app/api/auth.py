from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.database.session import get_db
from app.models import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/api/auth", tags=["authentication"])
bearer = HTTPBearer(auto_error=False)

@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = User(email=payload.email, full_name=payload.full_name, role=payload.role, password_hash=hash_password(payload.password))
    db.add(user); db.commit(); db.refresh(user)
    return TokenResponse(access_token=create_access_token(str(user.id), user.role), user=UserResponse.model_validate(user, from_attributes=True))

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return TokenResponse(access_token=create_access_token(str(user.id), user.role), user=UserResponse.model_validate(user, from_attributes=True))

@router.get("/me", response_model=UserResponse)
def me(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        claims = decode_access_token(credentials.credentials)
        user = db.get(User, int(claims["sub"]))
    except (ValueError, KeyError, TypeError):
        user = None
    if not user:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    return UserResponse.model_validate(user, from_attributes=True)
