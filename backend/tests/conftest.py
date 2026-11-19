"""Shared pytest fixtures for CareBridge AI backend tests."""

from collections.abc import Generator

from fastapi.testclient import TestClient
import pytest

from app.main import create_app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Provide an HTTPX-backed FastAPI TestClient."""
    application = create_app()
    with TestClient(application) as test_client:
        yield test_client
