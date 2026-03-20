from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.dependencies import get_db
from app.security import get_current_user, hash_password, verify_password
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
    user = crud.update_user(db, current_user, payload)
    return user_to_response(user)


@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def update_current_user_password(
    payload: schemas.UserPasswordChange,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    crud.update_user_password(db, current_user, hash_password(payload.new_password))
    return


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_user_account(
    payload: schemas.UserDeleteConfirm,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is incorrect",
        )

    crud.delete_user(db, current_user)
    return
