"""The file is used to avoid circular imports."""
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db: SQLAlchemy = SQLAlchemy()

login_manager: LoginManager = LoginManager()
login_manager.login_view = "login"  # redirect unauthenticated users to the login page

limiter = Limiter(key_func=get_remote_address, default_limits=["200 per day", "50 per hour"])
