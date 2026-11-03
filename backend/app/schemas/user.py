"""Pydantic v2 schemas for user authentication and responses.

Requires the `email-validator` package (install via `pip install pydantic[email]`
or `pip install email-validator`).
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    """Schema for user registration requests."""

    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    """Schema for user login requests."""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user data returned in API responses."""

    id: int
    email: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """Schema for JWT token responses."""

    access_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    """Schema for simple message responses."""

    message: str
