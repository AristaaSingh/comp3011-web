from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.dependencies import get_db
from app.security import get_current_user
from app.serializers import user_to_response

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=schemas.UserResponse)
def read_current_user_profile(current_user: models.User = Depends(get_current_user)):
    return user_to_response(current_user)


@router.patch("/me", response_model=schemas.UserResponse)
def update_current_user_profile(
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.email and payload.email.lower().strip() != current_user.email:
        existing_user = crud.get_user_by_email(db, payload.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists",
            )

    user = crud.update_user(db, current_user, payload)
    return user_to_response(user)
