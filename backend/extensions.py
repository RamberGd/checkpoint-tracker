"""The file is used to avoid circular imports."""
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

db: SQLAlchemy = SQLAlchemy()

login_manager: LoginManager = LoginManager()
login_manager.login_view = "login"  # redirect unauthenticated users to the login page
