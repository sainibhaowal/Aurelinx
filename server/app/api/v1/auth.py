"""
Authentication endpoints - Login, Register, Token refresh
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlmodel import Session as SQLSession, SQLModel, select
from datetime import timedelta
from uuid import UUID

from app.schemas.schemas import (
    LoginRequest, 
    LoginResponse, 
    RegisterRequest, 
    UserOut,
    DeleteAccountRequest,
    ResetWorkspaceRequest,
)
from app.models.database import UserTable, engine, get_session
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_user_strict,
    TokenData,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.core.logging_config import get_logger

router = APIRouter(prefix="/auth", tags=["authentication"])
logger = get_logger(__name__)

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    session: SQLSession = Depends(get_session)
):
    """
    Register a new user
    
    - **email**: User email (must be unique)
    - **full_name**: User full name
    - **password**: Password (min 8 chars, must contain uppercase and digit)
    """
    
    logger.info(f"New registration attempt for {request.email}")
    
    # Check if user exists
    existing_user = session.exec(
        select(UserTable).where(UserTable.email == request.email)
    ).first()
    
    if existing_user:
        logger.warning(f"Registration failed: Email already exists {request.email}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    # Create new user
    user = UserTable(
        email=request.email,
        full_name=request.full_name,
        hashed_password=hash_password(request.password),
        is_active=True,
        is_admin=False
    )
    
    session.add(user)
    session.commit()
    session.refresh(user)
    
    logger.info(f"User registered successfully: {user.id}")
    
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_admin=user.is_admin,
        created_at=user.created_at
    )

@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    session: SQLSession = Depends(get_session)
):
    """
    Login with email and password
    
    Returns access token and token expiry
    """
    
    logger.info(f"Login attempt for {request.email}")
    
    # Find user
    user = session.exec(
        select(UserTable).where(UserTable.email == request.email)
    ).first()
    
    if not user or not verify_password(request.password, user.hashed_password):
        logger.warning(f"Login failed: Invalid credentials for {request.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        logger.warning(f"Login failed: User inactive {request.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Create tokens
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "is_admin": user.is_admin
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    logger.info(f"Login successful for {user.id}")
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id
    )

@router.get("/me", response_model=UserOut)
async def get_current_user_profile(
    current_user: TokenData = Depends(get_current_user),
    session: SQLSession = Depends(get_session)
):
    """
    Get current user profile
    """
    user = session.get(UserTable, UUID(current_user.user_id))
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_admin=user.is_admin,
        created_at=user.created_at
    )

@router.post("/verify-token", response_model=dict)
async def verify_token(
    current_user: TokenData = Depends(get_current_user)
):
    """Verify if token is still valid"""
    return {
        "valid": True,
        "user_id": current_user.user_id,
        "email": current_user.email,
        "is_admin": current_user.is_admin
    }


@router.delete("/me", response_model=dict)
async def delete_current_account(
    request: DeleteAccountRequest,
    current_user: TokenData = Depends(get_current_user_strict),
    session: SQLSession = Depends(get_session),
):
    """Delete the currently authenticated user account."""
    if request.confirmation_text.strip().upper() != "DELETE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Type DELETE to confirm account deletion",
        )

    user = session.get(UserTable, UUID(current_user.user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    session.delete(user)
    session.commit()
    logger.info("User deleted account successfully: %s", current_user.user_id)
    return {"status": "deleted"}


@router.post("/reset-workspace", response_model=dict)
async def reset_workspace_data(
    request: ResetWorkspaceRequest,
    current_user: TokenData = Depends(get_current_user_strict),
    session: SQLSession = Depends(get_session),
):
    """
    Clear all non-user application data while preserving login accounts.
    This is intended for local demo resets.
    """
    if request.confirmation_text.strip().upper() != "RESET":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Type RESET to confirm workspace data reset",
        )

    preserved_tables = {"users"}
    deleted_tables = []

    try:
        for table in reversed(SQLModel.metadata.sorted_tables):
            if table.name in preserved_tables:
                continue
            session.execute(table.delete())
            deleted_tables.append(table.name)
        session.commit()
    except Exception as exc:
        session.rollback()
        logger.exception("Workspace reset failed for user %s", current_user.user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Workspace reset failed: {exc}",
        )

    logger.info(
        "Workspace reset completed by %s across %d tables",
        current_user.user_id,
        len(deleted_tables),
    )
    return {
        "status": "reset",
        "deleted_tables": deleted_tables,
        "preserved_tables": sorted(preserved_tables),
    }
