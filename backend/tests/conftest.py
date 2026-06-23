import os
# Bind the app to an in-memory database BEFORE importing it. In Flask-SQLAlchemy
# 3.x the engine is created at import time, so reassigning the URI afterwards is
# a no-op — that is why the suite previously dropped the real instance/database.db
# on teardown. Setting DATABASE_URL here makes tests isolated at the source.
os.environ.setdefault('DATABASE_URL', 'sqlite:///:memory:')

import pytest
import unittest.mock
from backend import app, db


@pytest.fixture
def client():
    """Provide a Flask test client with an isolated database."""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['WTF_CSRF_ENABLED'] = False

    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()


@pytest.fixture
def test_user(client):
    """Create a standard test user and return their integer ID."""
    from backend.models import User
    from backend.extensions import db
    from flask_bcrypt import Bcrypt
    bcrypt = Bcrypt()
    user = User(
        username='testuser',
        email='test@test.com',
        password=bcrypt.generate_password_hash('password123')
    )
    db.session.add(user)
    db.session.commit()
    return user.id


@pytest.fixture
def logged_in_client(client, test_user):
    """Provide a test client with the test user already authenticated."""
    with client.session_transaction() as sess:
        sess['_user_id'] = str(test_user)
        sess['_fresh'] = True
    return client


@pytest.fixture
def mock_token():
    """Patch IGDB token retrieval so tests never hit the Twitch OAuth endpoint."""
    with unittest.mock.patch('backend.igdb.get_token', return_value='fake_token'):
        yield


@pytest.fixture
def mock_igdb_post():
    """Patch the IGDB HTTP POST call for tests that need to control the response."""
    with unittest.mock.patch('backend.igdb.requests.post') as mock_post:
        yield mock_post
