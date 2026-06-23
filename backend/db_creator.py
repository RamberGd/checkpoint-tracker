"""One-off script to initialise the database and create all tables. The database is initalised automatically, but the script can be used for debugging.

Run directly to set up the SQLite database:
    python -m backend.db_creator
"""
from backend import app, db

with app.app_context():
    db.create_all()
    print(db.metadata.tables)
    print(app.config['SQLALCHEMY_DATABASE_URI'])
