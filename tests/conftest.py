import os
import re
import tempfile
import uuid
from pathlib import Path

import pytest


os.environ["APP_ENV"] = "development"
os.environ["SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ["ADMIN_NAME"] = "Administrador de Teste"
os.environ["ADMIN_EMAIL"] = "admin@example.com"
os.environ["ADMIN_PASSWORD"] = "Temporary@123"
os.environ["PAYMENTS_ENABLED"] = "false"
os.environ["SQLITE_PATH"] = tempfile.NamedTemporaryFile(suffix=".db", delete=False).name


@pytest.fixture
def app():
    import database
    import main

    db_path = Path(__file__).parent / f"test-{uuid.uuid4().hex}.db"
    database.DB_NAME = str(db_path)
    database.DATABASE_URL = None
    main.app.config.update(TESTING=True, SESSION_COOKIE_SECURE=False)
    database.criar_tabelas()
    database.criar_admin_inicial()
    yield main.app
    db_path.unlink(missing_ok=True)


@pytest.fixture
def client(app):
    return app.test_client()


def csrf_token(response):
    match = re.search(rb'name="csrf-token" content="([^"]+)"', response.data)
    assert match
    return match.group(1).decode()


@pytest.fixture
def csrf():
    return csrf_token
