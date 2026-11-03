"""Authentication routes for user registration, login, logout, and profile retrieval."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.db.database import get_db
from app.db.models import User
from app.schemas.user import (
    MessageResponse,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Dependency that extracts and validates the current user from a JWT Bearer token.

    Args:
        token: The JWT access token extracted from the Authorization header.
        db: The database session.

    Returns:
        The authenticated User ORM object.

    Raises:
        HTTPException: 401 if the token is invalid or the user is not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id_str: str | None = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    return user


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def register(user_data: UserCreate, db: Session = Depends(get_db)) -> User:
    """Register a new user account.

    Args:
        user_data: The registration payload containing email and password.
        db: The database session.

    Returns:
        The newly created user record.

    Raises:
        HTTPException: 400 if the email is already registered.
    """
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    hashed = hash_password(user_data.password)
    new_user = User(email=user_data.email, hashed_password=hashed)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in and receive a JWT token",
)
def login(user_data: UserLogin, db: Session = Depends(get_db)) -> dict:
    """Authenticate a user and return a JWT access token.

    Args:
        user_data: The login payload containing email and password.
        db: The database session.

    Returns:
        A dictionary with the access_token and token_type.

    Raises:
        HTTPException: 401 if the credentials are invalid.
    """
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Log out (stateless — clears client-side token)",
)
def logout() -> dict:
    """Log out the current user.

    Since JWT authentication is stateless, this endpoint simply returns a
    confirmation message. In a cookie-based implementation this would clear the
    session cookie.

    Returns:
        A confirmation message.
    """
    return {"message": "Logged out successfully"}


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile",
)
def get_me(current_user: User = Depends(get_current_user)) -> User:
    """Return the profile of the currently authenticated user.

    Args:
        current_user: The authenticated user injected by the get_current_user dependency.

    Returns:
        The authenticated user's profile data.
    """
    return current_user
