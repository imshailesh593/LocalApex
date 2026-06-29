from pydantic import BaseModel, EmailStr
from models.user import UserRole


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.admin


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    email: str
    role: UserRole

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class UserInvite(BaseModel):
    name: str
    email: EmailStr
    role: UserRole = UserRole.admin
    password: str
