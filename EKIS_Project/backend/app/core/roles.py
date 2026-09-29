from enum import StrEnum


class UserRole(StrEnum):
    SUPERUSER = "SUPERUSER"
    ADMIN = "ADMIN"
    EMPLOYEE = "EMPLOYEE"
