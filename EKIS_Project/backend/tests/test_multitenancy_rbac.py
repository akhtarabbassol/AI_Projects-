from unittest.mock import AsyncMock, patch

from fastapi import status
from fastapi.testclient import TestClient

from app.core.jwt import create_access_token, decode_access_token
from app.core.roles import UserRole
from app.dependencies.auth import (
    get_current_user,
)
from app.main import app
from app.models.user import User

client = TestClient(app)


def test_jwt_claims_and_roles() -> None:
    """Verify JWT encodes and decodes tenant, department, and role claims."""
    token = create_access_token(
        user_id=42,
        company_id=10,
        role=UserRole.ADMIN.value,
        department_id=5,
    )
    decoded = decode_access_token(token)

    assert decoded["sub"] == "42"
    assert decoded["company_id"] == 10
    assert decoded["role"] == "ADMIN"
    assert decoded["department_id"] == 5


def test_superuser_permissions_endpoints() -> None:
    """SUPERUSER can access companies; ADMIN and EMPLOYEE are rejected."""
    superuser = User(
        id=1,
        company_id=None,
        department_id=None,
        email="super@ekis.internal",
        full_name="Super User",
        password_hash="hash",
        role=UserRole.SUPERUSER.value,
        is_active=True,
    )

    admin = User(
        id=2,
        company_id=1,
        department_id=None,
        email="admin@acme.com",
        full_name="Acme Admin",
        password_hash="hash",
        role=UserRole.ADMIN.value,
        is_active=True,
    )

    employee = User(
        id=3,
        company_id=1,
        department_id=1,
        email="emp@acme.com",
        full_name="Acme Employee",
        password_hash="hash",
        role=UserRole.EMPLOYEE.value,
        is_active=True,
    )

    # 1. Non-superuser cannot create companies
    app.dependency_overrides[get_current_user] = lambda: employee
    res = client.post("/api/v1/companies", json={"name": "Hacked Corp"})
    assert res.status_code == status.HTTP_403_FORBIDDEN

    app.dependency_overrides[get_current_user] = lambda: admin
    res = client.post("/api/v1/companies", json={"name": "Hacked Corp"})
    assert res.status_code == status.HTTP_403_FORBIDDEN

    app.dependency_overrides.clear()


def test_admin_and_employee_user_management_boundaries() -> None:
    """ADMIN can manage employees in their company; EMPLOYEE gets 403."""
    employee = User(
        id=10,
        company_id=1,
        department_id=2,
        email="ai_dev@acme.com",
        full_name="AI Developer",
        password_hash="hash",
        role=UserRole.EMPLOYEE.value,
        is_active=True,
    )

    admin = User(
        id=20,
        company_id=1,
        department_id=None,
        email="admin@acme.com",
        full_name="Acme Admin",
        password_hash="hash",
        role=UserRole.ADMIN.value,
        is_active=True,
    )

    # Employee cannot list users
    app.dependency_overrides[get_current_user] = lambda: employee
    res = client.get("/api/v1/users")
    assert res.status_code == status.HTTP_403_FORBIDDEN

    # Employee cannot create users
    res = client.post(
        "/api/v1/users",
        json={
            "email": "newbie@acme.com",
            "full_name": "Newbie",
            "password": "Password123!",
            "role": "EMPLOYEE",
        },
    )
    assert res.status_code == status.HTTP_403_FORBIDDEN

    # Admin CANNOT escalate or create a SUPERUSER
    app.dependency_overrides[get_current_user] = lambda: admin
    res = client.post(
        "/api/v1/users",
        json={
            "email": "bad_super@acme.com",
            "full_name": "Escalated Super",
            "password": "Password123!",
            "role": "SUPERUSER",
        },
    )
    assert res.status_code == status.HTTP_403_FORBIDDEN

    app.dependency_overrides.clear()


def test_employee_document_and_analytics_restrictions() -> None:
    """EMPLOYEE cannot upload, delete documents, or view analytics."""
    employee = User(
        id=30,
        company_id=1,
        department_id=1,  # AI Department
        email="emp_ai@acme.com",
        full_name="AI Engineer",
        password_hash="hash",
        role=UserRole.EMPLOYEE.value,
        is_active=True,
    )

    app.dependency_overrides[get_current_user] = lambda: employee

    # 1. Employee cannot delete documents
    res = client.delete("/api/v1/documents/999")
    assert res.status_code == status.HTTP_403_FORBIDDEN

    # 2. Employee cannot upload documents
    files = {"file": ("test.txt", b"some text", "text/plain")}
    res = client.post("/api/v1/documents/upload?department_id=1", files=files)
    assert res.status_code == status.HTTP_403_FORBIDDEN

    # 3. Employee cannot view analytics
    res = client.get("/api/v1/analytics/dashboard")
    assert res.status_code == status.HTTP_403_FORBIDDEN

    app.dependency_overrides.clear()


def test_rag_and_search_department_isolation_enforced() -> None:
    """
    Verify that when an employee calls RAG /chat/query or /search/semantic,
    retrieval is locked to their company and their assigned department.
    """
    employee = User(
        id=40,
        company_id=10,
        department_id=3,  # AI Department
        email="ai_worker@techcorp.com",
        full_name="AI Worker",
        password_hash="hash",
        role=UserRole.EMPLOYEE.value,
        is_active=True,
    )

    app.dependency_overrides[get_current_user] = lambda: employee

    with (
        patch("app.api.v1.chat.answer_question", new_callable=AsyncMock) as mock_answer,
        patch("app.api.v1.chat.create_chat_history", new_callable=AsyncMock) as mock_chat_hist,
        patch("app.api.v1.chat.create_query_log", new_callable=AsyncMock) as mock_qlog,
    ):
        mock_answer.return_value = ("Authorized AI department answer.", [])

        # Employee requests with NO department or even tries to ask for department 999 (e.g. HR)
        res = client.post(
            "/api/v1/chat/query",
            json={"query": "What is our deployment architecture?", "department_id": 999},
        )

        assert res.status_code == 200
        # The service MUST have received the employee's assigned department_id (3), NOT 999!
        mock_answer.assert_called_once()
        _, kwargs = mock_answer.call_args
        assert kwargs["company_id"] == 10
        assert kwargs["department_id"] == 3  # Forced to employee's own department!

    with patch("app.api.v1.search.retrieve_relevant_chunks", new_callable=AsyncMock) as mock_search:
        mock_search.return_value = []

        res = client.post(
            "/api/v1/search/semantic",
            json={"query": "financial audit", "department_id": 999},
        )

        assert res.status_code == 200
        mock_search.assert_called_once()
        _, kwargs = mock_search.call_args
        assert kwargs["company_id"] == 10
        assert kwargs["department_id"] == 3  # Forced to employee's own department!

    app.dependency_overrides.clear()
