from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.dependencies import get_db
from app.security import authenticate_user, create_access_token, get_current_user, hash_password
from app.serializers import user_to_response

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.TokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    existing_user = crud.get_user_by_email(db, payload.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user = crud.create_user(db, payload.email, hash_password(payload.password))
    token = create_access_token(subject=user.email, user_id=user.id)
    return schemas.TokenResponse(access_token=token, user=user_to_response(user))


@router.post("/login", response_model=schemas.TokenResponse)
def login_user(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(subject=user.email, user_id=user.id)
    return schemas.TokenResponse(access_token=token, user=user_to_response(user))


@router.get("/me", response_model=schemas.UserResponse)
def read_current_user(current_user: models.User = Depends(get_current_user)):
    return user_to_response(current_user)
