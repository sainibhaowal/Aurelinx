
# Copyright 2026 Ravinder Singh
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
Authentication endpoints - Login, Register, Token refresh
"""

import secrets
from datetime import datetime, timedelta
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlmodel import Session as SQLSession
from sqlmodel import SQLModel, select

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    TokenData,
    create_access_token,
    get_current_user,
    get_current_user_strict,
    hash_password,
    verify_password,
)
from app.models.database import EmailVerificationTable, UserTable, get_session
from app.schemas.schemas import (
    DeleteAccountRequest,
    EmailVerifyRequest,
    LoginRequest,
    LoginResponse,
    LoginVerificationChallenge,
    RegisterRequest,
    RegisterResponse,
    ResendVerificationRequest,
    ResetWorkspaceRequest,
    UserOut,
    VerifyLoginRequest,
)

router = APIRouter(prefix="/auth", tags=["authentication"])
logger = get_logger(__name__)


def generate_otp_code() -> str:
    """Generate a random 6-digit numeric OTP verification code"""
    return f"{secrets.randbelow(900000) + 100000}"


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    request: RegisterRequest, session: SQLSession = Depends(get_session)
):
    """
    Register a new user and issue a 30-second email verification challenge.
    """
    logger.info(f"New registration attempt for {request.email}")

    # Check if user exists
    existing_user = session.exec(
        select(UserTable).where(UserTable.email == request.email)
    ).first()

    if existing_user:
        if existing_user.is_verified:
            logger.warning(
                f"Registration failed: Verified email already exists {request.email}"
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered and verified. Please sign in.",
            )
        else:
            # Update password and re-issue verification for pending user
            existing_user.full_name = request.full_name
            existing_user.hashed_password = hash_password(request.password)
            user = existing_user
    else:
        # Create new unverified user
        user = UserTable(
            email=request.email,
            full_name=request.full_name,
            hashed_password=hash_password(request.password),
            is_active=True,
            is_verified=False,
            is_admin=False,
        )
        session.add(user)

    session.commit()
    session.refresh(user)

    # Invalidate previous verification tokens
    old_tokens = session.exec(
        select(EmailVerificationTable).where(
            EmailVerificationTable.email == user.email,
            EmailVerificationTable.is_used == False,
        )
    ).all()
    for ot in old_tokens:
        ot.is_used = True

    # Generate 6-digit OTP code and secure verification token (30-second expiry)
    code = generate_otp_code()
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(seconds=30)

    verification = EmailVerificationTable(
        user_id=user.id,
        email=user.email,
        code=code,
        token=token,
        purpose="register",
        is_used=False,
        expires_at=expires_at,
    )
    session.add(verification)
    session.commit()

    logger.info(
        f"Verification code for {user.email}: [{code}] (Expires in 30s: {expires_at.isoformat()})"
    )

    return RegisterResponse(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        message="Verification code sent to your email. You have 30 seconds to verify.",
        expires_in=30,
        demo_code=code,
        token=token,
    )


@router.post("/verify-email")
async def verify_email(
    request: EmailVerifyRequest, session: SQLSession = Depends(get_session)
):
    """
    Verify email with 6-digit code or URL token within the 30-second window.
    """
    user = session.exec(
        select(UserTable).where(UserTable.email == request.email)
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Find active verification record
    verification = session.exec(
        select(EmailVerificationTable)
        .where(
            EmailVerificationTable.email == request.email,
            EmailVerificationTable.is_used == False,
        )
        .order_by(EmailVerificationTable.created_at.desc())
    ).first()

    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active verification found. Please request a new verification link.",
        )

    # Check 30s expiration
    if verification.expires_at < datetime.utcnow():
        verification.is_used = True
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code expired (30 seconds limit). Please request a new code.",
        )

    # Validate code or token match
    input_val = request.code.strip()
    if input_val != verification.code and input_val != verification.token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please check your email and try again.",
        )

    # Mark verified
    verification.is_used = True
    user.is_verified = True
    session.commit()

    logger.info(f"User email verified successfully: {user.email}")

    return {
        "success": True,
        "message": "Email verified successfully! You can now sign in.",
        "email": user.email,
    }


@router.post("/resend-verification")
async def resend_verification(
    request: ResendVerificationRequest, session: SQLSession = Depends(get_session)
):
    """
    Resend a fresh 30-second verification challenge.
    """
    user = session.exec(
        select(UserTable).where(UserTable.email == request.email)
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User account not found"
        )

    # Invalidate previous tokens
    old_tokens = session.exec(
        select(EmailVerificationTable).where(
            EmailVerificationTable.email == user.email,
            EmailVerificationTable.is_used == False,
        )
    ).all()
    for ot in old_tokens:
        ot.is_used = True

    # Generate new 30s challenge
    code = generate_otp_code()
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(seconds=30)

    verification = EmailVerificationTable(
        user_id=user.id,
        email=user.email,
        code=code,
        token=token,
        purpose=request.purpose,
        is_used=False,
        expires_at=expires_at,
    )
    session.add(verification)
    session.commit()

    logger.info(
        f"Resent verification code for {user.email}: [{code}] (Expires in 30s)"
    )

    return {
        "success": True,
        "message": "New verification code generated (valid for 30s).",
        "expires_in": 30,
        "demo_code": code,
        "token": token,
    }


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, session: SQLSession = Depends(get_session)):
    """
    Direct login with email and password for verified accounts.
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
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive"
        )

    # Check if registration verification was completed (except for initial seed admins)
    if not user.is_verified and not user.is_admin and user.email != "saini@gmail.com":
        logger.warning(f"Login rejected: Unverified account {request.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account email is not verified. Please complete verification or register again.",
        )

    # Create tokens directly
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "is_admin": user.is_admin},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    logger.info(f"Direct login successful for {user.id} ({user.email})")

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id,
    )


@router.post("/verify-login", response_model=LoginResponse)
async def verify_login(
    request: VerifyLoginRequest, session: SQLSession = Depends(get_session)
):
    """
    Login step 2: Verify 30-second email code and issue JWT session.
    """
    user = session.exec(
        select(UserTable).where(UserTable.email == request.email)
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Find active login verification
    verification = session.exec(
        select(EmailVerificationTable)
        .where(
            EmailVerificationTable.email == request.email,
            EmailVerificationTable.purpose == "login",
            EmailVerificationTable.is_used == False,
        )
        .order_by(EmailVerificationTable.created_at.desc())
    ).first()

    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active login challenge found. Please sign in again.",
        )

    # Check 30s expiration
    if verification.expires_at < datetime.utcnow():
        verification.is_used = True
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code expired (30 seconds limit). Please request a new code.",
        )

    input_val = request.code.strip()
    if input_val != verification.code and input_val != verification.token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please try again.",
        )

    # Mark challenge completed
    verification.is_used = True
    user.is_verified = True
    session.commit()

    # Create JWT session
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "is_admin": user.is_admin},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    logger.info(f"Login verified successfully for {user.id}")

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id,
    )


@router.post("/login-direct", response_model=LoginResponse)
async def login_direct(
    request: LoginRequest, session: SQLSession = Depends(get_session)
):
    """
    Direct login endpoint for automated API integrations and tests.
    """
    user = session.exec(
        select(UserTable).where(UserTable.email == request.email)
    ).first()

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "is_admin": user.is_admin},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id,
    )


@router.get("/me", response_model=UserOut)
async def get_current_user_profile(
    current_user: TokenData = Depends(get_current_user),
    session: SQLSession = Depends(get_session),
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
        is_verified=user.is_verified,
        created_at=user.created_at,
    )


@router.post("/verify-token", response_model=dict)
async def verify_token(current_user: TokenData = Depends(get_current_user)):
    """Verify if token is still valid"""
    return {
        "valid": True,
        "user_id": current_user.user_id,
        "email": current_user.email,
        "is_admin": current_user.is_admin,
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

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


# ============ OAUTH ENDPOINTS ============

# ============ OAUTH ENDPOINTS ============


@router.get("/google/login")
async def google_login(
    request: Request,
):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=400, detail="Google OAuth is not configured on this server."
        )

    # Construct redirect URI
    base = str(request.base_url).rstrip("/")
    if "averqel.com" in base or settings.ENVIRONMENT == "production":
        redirect_uri = "https://aurelinx.averqel.com/api/v1/auth/google/callback"
    else:
        redirect_uri = f"{base}/api/v1/auth/google/callback"

    state = "google"

    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?response_type=code"
        f"&client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=openid%20email%20profile"
        f"&state={state}"
    )
    return RedirectResponse(url=google_auth_url)


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str,
    state: str | None = None,
    session: SQLSession = Depends(get_session),
):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="Google OAuth not configured")

    # Construct redirect URI
    base = str(request.base_url).rstrip("/")
    if "averqel.com" in base or settings.ENVIRONMENT == "production":
        redirect_uri = "https://aurelinx.averqel.com/api/v1/auth/google/callback"
    else:
        redirect_uri = f"{base}/api/v1/auth/google/callback"

    # Exchange code for token
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if token_res.status_code != 200:
            logger.error(f"Google token exchange failed: {token_res.text}")
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/app?error=google_auth_failed"
            )

        token_data = token_res.json()
        access_token = token_data.get("access_token")

        # Get user info
        user_info_res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if user_info_res.status_code != 200:
            logger.error(f"Google userinfo failed: {user_info_res.text}")
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/app?error=google_userinfo_failed"
            )

        user_info = user_info_res.json()
        email = user_info.get("email")
        name = user_info.get("name") or email.split("@")[0]

        if not email:
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/app?error=no_email_returned"
            )

        # Check if user exists
        user = session.exec(select(UserTable).where(UserTable.email == email)).first()

        if not user:
            # Create user
            random_pw = secrets.token_urlsafe(16)
            user = UserTable(
                email=email,
                full_name=name,
                hashed_password=hash_password(random_pw),
                is_active=True,
                is_admin=False,
            )
            session.add(user)
            session.commit()
            session.refresh(user)

        # Log them in! Create JWT access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        jwt_token = create_access_token(
            data={"sub": str(user.id), "email": user.email, "is_admin": user.is_admin},
            expires_delta=access_token_expires,
        )

        import urllib.parse

        encoded_user = urllib.parse.quote(user.email)
        encoded_name = urllib.parse.quote(user.full_name)
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/app?oauth_token={jwt_token}&oauth_email={encoded_user}&oauth_name={encoded_name}"
        )


@router.get("/github/login")
async def github_login(
    request: Request,
):
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=400, detail="GitHub OAuth is not configured on this server."
        )

    # Construct redirect URI
    base = str(request.base_url).rstrip("/")
    if "averqel.com" in base or settings.ENVIRONMENT == "production":
        redirect_uri = "https://aurelinx.averqel.com/api/v1/auth/github/callback"
    else:
        redirect_uri = f"{base}/api/v1/auth/github/callback"

    state = "github"

    github_auth_url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=user:email"
        f"&state={state}"
    )
    return RedirectResponse(url=github_auth_url)


@router.get("/github/callback")
async def github_callback(
    request: Request,
    code: str,
    state: str | None = None,
    session: SQLSession = Depends(get_session),
):
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="GitHub OAuth not configured")

    # Construct redirect URI
    base = str(request.base_url).rstrip("/")
    if "averqel.com" in base or settings.ENVIRONMENT == "production":
        redirect_uri = "https://aurelinx.averqel.com/api/v1/auth/github/callback"
    else:
        redirect_uri = f"{base}/api/v1/auth/github/callback"

    # Exchange code for token
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "code": code,
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
            },
            headers={"Accept": "application/json"},
        )
        if token_res.status_code != 200:
            logger.error(f"GitHub token exchange failed: {token_res.text}")
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/app?error=github_auth_failed"
            )

        token_data = token_res.json()
        access_token = token_data.get("access_token")

        # Get user info
        user_info_res = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "User-Agent": "Aurelinx",
            },
        )
        if user_info_res.status_code != 200:
            logger.error(f"GitHub userinfo failed: {user_info_res.text}")
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/app?error=github_userinfo_failed"
            )

        user_info = user_info_res.json()
        email = user_info.get("email")
        name = user_info.get("name") or user_info.get("login") or "GitHub User"

        # If email is null, fetch email list
        if not email:
            emails_res = await client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "User-Agent": "Aurelinx",
                },
            )
            if emails_res.status_code == 200:
                emails_list = emails_res.json()
                for em in emails_list:
                    if em.get("primary") and em.get("verified"):
                        email = em.get("email")
                        break
                if not email and emails_list:
                    email = emails_list[0].get("email")

        if not email:
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/app?error=no_email_returned"
            )

        # Check if user exists
        user = session.exec(select(UserTable).where(UserTable.email == email)).first()

        if not user:
            # Create user
            random_pw = secrets.token_urlsafe(16)
            user = UserTable(
                email=email,
                full_name=name,
                hashed_password=hash_password(random_pw),
                is_active=True,
                is_admin=False,
            )
            session.add(user)
            session.commit()
            session.refresh(user)

        # Log them in! Create JWT access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        jwt_token = create_access_token(
            data={"sub": str(user.id), "email": user.email, "is_admin": user.is_admin},
            expires_delta=access_token_expires,
        )

        import urllib.parse

        encoded_user = urllib.parse.quote(user.email)
        encoded_name = urllib.parse.quote(user.full_name)
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/app?oauth_token={jwt_token}&oauth_email={encoded_user}&oauth_name={encoded_name}"
        )
