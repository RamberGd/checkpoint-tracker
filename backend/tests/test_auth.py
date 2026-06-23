import pytest
from backend import app, db


def signup(client, username:str, email:str, password:str, confirm:str):
    """
        Send a signup request.

        This is a helper function helping in tests to simulate a user
        submitting the signup.

        Args:
            client: Flask test client instance.
            username (str): Username for the new account.
            email (str): Email for the new account.
            password (str): Password for the new account.
            confirm (str): Password confirmation.

        Returns:
            Response: Flask test response object.
        """
    return client.post(
        '/signup', data={
        'username': username,
        'email': email,
        'password': password,
        'confirm': confirm
    }, follow_redirects=True)

def login(client, username_or_email:str, password:str):
    """
       Send a login request.

       This helper function helping in tests to simulate a user
       logging in with either a username or email address.

       Args:
           client: Flask test client instance.
           username_or_email (str): User's username or email.
           password (str): User's password.

       Returns:
           Response: Flask test response object.
       """
    return client.post('/login', data={
        'username_or_email': username_or_email,
        'password': password
    }, follow_redirects=True)

class TestingSignup:
    def test_successful_signup(self, client):
        """Verifies if signup is successful"""
        response = signup(client, 'ana1', 'ana@gmail.com', 'secret123', 'secret123')
        assert response.status_code == 200
        assert b'Log in' in response.data

    def test_signup_email_already_exists(self, client):
        """Verifies if email already exists"""
        signup(client, 'ana2', 'ana2@gmail.com', 'secret123', 'secret123')
        response = signup(client,'ana2', 'ana2@gmail.com', 'secret123', 'secret123' )
        assert response.status_code != 302
        assert b'email already exists' in response.data

    def test_signup_username_already_exists(self, client):
        """Verifies if username already exists"""
        signup(client, 'ana3', 'anna@gmail.com', 'secret123', 'secret123')
        response = signup(client, 'ana3', 'anna@gmail.com', 'secret123', 'secret123')
        assert response.status_code != 302
        assert b'username already exists' in response.data

    def test_signup_empty_fields(self, client):
        """Verifies if any fields are empty"""
        test_cases = [('', 'bob2@gmail.com', 'secret123', 'secret123'),
                      ('bob2', '', 'secret123', 'secret123'),
                      ('bob2', 'bob2@gmail.com', '', 'secret123'),
                      ('bob2', 'bob2@gmail.com', 'secret123', '')]
        for username, email, password, confirm in test_cases:
            response = signup(client, username, email, password, confirm)
            assert b'All fields are required' in response.data


class TestingLogin:
    def test_successful_login(self, client):
        """Verifies if login is successful with username"""
        signup(client, 'bob1', 'bob@gmail.com', 'secret123', 'secret123')
        response = login(client, 'bob1', 'secret123')
        assert response.status_code == 200
        assert b'Profile' in response.data

    def test_successful_login_with_email(self, client):
        """Verifies if login is successful with email"""
        signup(client, 'bob1', 'bob@gmail.com', 'secret123', 'secret123')
        response = login(client, 'bob@gmail.com', 'secret123')
        assert response.status_code == 200
        assert b'Profile' in response.data


class TestingPassword:
    """Verifies if passwords match"""
    def test_signup_password_dont_match(self, client):
        response = signup(client, 'jay1', 'jay@gmail.com', 'secret123', 'notsecret123')
        assert response.status_code == 200
        assert b'Passwords do not match' in response.data



