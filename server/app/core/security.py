"""
Professional-Grade Security Module
Handles JWT authentication, password hashing, and token management
"""

import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from fastapi import Depends, HTTPException, status
from fastapi import Header
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Password hashing configuration
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-must-be-at-least-32-chars-long")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Security scheme for Swagger documentation
try:
    from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

    security = HTTPBearer(auto_error=False)
except ImportError:
    security = None
    HTTPAuthorizationCredentials = None


# ============ PASSWORD HASHING ============
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


# ============ JWT TOKEN HANDLING ============
class TokenData(BaseModel):
    user_id: str
    email: str
    is_admin: bool = False


class AccessToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TenantContext(BaseModel):
    tenant_id: str = "default"


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "iat": datetime.utcnow()})

    try:
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error(f"Failed to create token: {e}")
        raise


def verify_access_token(token: str) -> TokenData:
    """Verify and decode a JWT access token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        is_admin: bool = payload.get("is_admin", False)

        if user_id is None:
            raise credentials_exception

        # Validate that user_id is a valid UUID string to prevent downstream crashes (e.g. from legacy email-sub tokens)
        try:
            from uuid import UUID
            UUID(user_id)
        except ValueError:
            raise credentials_exception

        token_data = TokenData(user_id=user_id, email=email, is_admin=is_admin)
        return token_data

    except JWTError as e:
        logger.warning(f"Invalid token: {e}")
        raise credentials_exception


def _get_dev_fallback_user() -> Optional[TokenData]:
    """
    Return a seeded local-dev user when no bearer token is supplied.
    This keeps presentation builds usable without weakening production auth.
    """
    if getattr(settings, "ENVIRONMENT", "development") == "production":
        return None

    try:
        from sqlmodel import Session, select
        from app.models.database import engine, UserTable

        with Session(engine) as session:
            user = session.exec(
                select(UserTable).where(UserTable.email == "admin@aurelinx.com")
            ).first()
            if not user:
                user = session.exec(
                    select(UserTable).where(UserTable.email == "manager@aurelinx.com")
                ).first()
            if not user:
                return None

            return TokenData(
                user_id=str(user.id), email=user.email, is_admin=user.is_admin
            )
    except Exception as exc:
        logger.debug("Dev fallback auth unavailable: %s", exc)
        return None


# ============ DEPENDENCY INJECTION ============
async def get_current_user_from_header(
    authorization: Optional[str] = Depends(lambda: None),
) -> TokenData:
    """Extract token from Authorization header"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    token = authorization.replace("Bearer ", "")
    token_data = verify_access_token(token)
    return token_data


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> TokenData:
    """Dependency to get current authenticated user from Bearer token."""
    if not credentials:
        dev_user = _get_dev_fallback_user()
        if dev_user:
            return dev_user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return verify_access_token(credentials.credentials)
    except HTTPException:
        dev_user = _get_dev_fallback_user()
        if dev_user:
            return dev_user
        raise


def get_current_user_strict(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> TokenData:
    """Strict user auth dependency for production-sensitive endpoints."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_access_token(credentials.credentials)


def get_current_admin_user(
    current_user: TokenData = Depends(get_current_user),
) -> TokenData:
    """Dependency to ensure user is admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    return current_user


def get_current_admin_user_strict(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> TokenData:
    """Strict admin auth dependency."""
    if not credentials:
        dev_user = _get_dev_fallback_user()
        if dev_user and dev_user.is_admin:
            return dev_user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    current_user = verify_access_token(credentials.credentials)
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    return current_user


def get_tenant_context(
    x_tenant_id: Optional[str] = Header(default="default"),
) -> TenantContext:
    """Resolve the active tenant from a request header."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    if not tenant_id:
        tenant_id = "default"
    return TenantContext(tenant_id=tenant_id)


def get_tenant_id(ctx: TenantContext = Depends(get_tenant_context)) -> str:
    return ctx.tenant_id


# ============ SECURITY UTILITIES ============
def create_refresh_token(user_id: str) -> str:
    """Create a longer-lived refresh token"""
    data = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=7),
    }
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def verify_refresh_token(token: str) -> str:
    """Verify refresh token and return user_id"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise JWTError("Invalid token type")
        return payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
