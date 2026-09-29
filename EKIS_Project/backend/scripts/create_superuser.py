import asyncio
import getpass

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.roles import UserRole
from app.core.security import hash_password
from app.models.user import User


async def create_superuser():
    print("=== EKIS Superuser Creation ===")

    email = input("Superuser email: ").strip().lower()
    full_name = input("Superuser full name: ").strip()
    password = getpass.getpass("Superuser password: ")
    confirm_password = getpass.getpass("Confirm password: ")

    if password != confirm_password:
        print("Error: Passwords do not match.")
        return

    if len(password) < 8:
        print("Error: Password must be at least 8 characters.")
        return

    async with AsyncSessionLocal() as db:
        existing_user = await db.scalar(select(User).where(User.email == email))

        if existing_user:
            print(f"Error: User with email '{email}' already exists.")
            return

        superuser = User(
            company_id=None,
            department_id=None,
            email=email,
            full_name=full_name,
            password_hash=hash_password(password),
            role=UserRole.SUPERUSER.value,
            is_active=True,
        )

        db.add(superuser)

        await db.commit()
        await db.refresh(superuser)

        print("\nSuperuser created successfully!")
        print(f"ID: {superuser.id}")
        print(f"Email: {superuser.email}")
        print(f"Role: {superuser.role}")
        print(f"Company ID: {superuser.company_id}")
        print(f"Department ID: {superuser.department_id}")


if __name__ == "__main__":
    asyncio.run(create_superuser())
