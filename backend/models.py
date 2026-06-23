import datetime
from typing import Optional
from flask_login import UserMixin
from backend.extensions import db, login_manager


@login_manager.user_loader
def load_user(user_id: str) -> Optional['User']:
    """Load a user from the DB by their session ID (required by Flask-Login)."""
    return User.query.get(int(user_id))


class User(db.Model, UserMixin):
    """Registered application user"""
    id: int = db.Column(db.Integer, primary_key=True)
    username: str = db.Column(db.String(20), unique=True, nullable=False)
    email: str = db.Column(db.String(120), unique=True, nullable=False)
    password: str = db.Column(db.String(60), nullable=False)
    profile_pic: Optional[str] = db.Column(db.String(255), nullable=True)


class Game(db.Model):
    """Game record cached from IGDB"""
    igdb_id: int = db.Column(db.Integer, unique=True, nullable=False, primary_key=True)
    itad_id: Optional[str] = db.Column(db.String(64), unique=True, nullable=True)  # cached after first ITAD lookup
    title: str = db.Column(db.String(255), nullable=False)
    summary: Optional[str] = db.Column(db.Text, nullable=True)
    cover_url: Optional[str] = db.Column(db.String(511), nullable=True)
    genres: Optional[str] = db.Column(db.Text, nullable=True)  # comma-separated genre names
    release_date: Optional[datetime.date] = db.Column(db.Date, nullable=True)


class Review(db.Model):
    """A user's review of a game. One review per user per game"""
    id: int = db.Column(db.Integer, primary_key=True)
    user_id: int = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    game_id: int = db.Column(db.Integer, db.ForeignKey('game.igdb_id'), nullable=False)
    rating: float = db.Column(db.Float, nullable=False)  # must be between 1 and 5
    comment: Optional[str] = db.Column(db.Text, nullable=True)
    created_at: datetime.datetime = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.datetime.now(datetime.timezone.utc)
    )
    user = db.relationship('User', backref=db.backref('reviews', lazy=True))
    game = db.relationship('Game', backref=db.backref('reviews', lazy=True))

    __table_args__ = (
        db.UniqueConstraint('user_id', 'game_id'),
        db.CheckConstraint('rating >= 1 AND rating <= 5', name='rating_range'),
    )


class ReplyToReview(db.Model):
    """A reply posted by a user on another user's review"""
    id: int = db.Column(db.Integer, primary_key=True)
    user_id: int = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    review_id: int = db.Column(db.Integer, db.ForeignKey('review.id'), nullable=False)
    comment: str = db.Column(db.Text, nullable=False)
    user = db.relationship('User', backref=db.backref('reply_to_reviews', lazy=True))
    # ensures that replies are deleted when the parent review is deleted
    review = db.relationship('Review', backref=db.backref('replies', lazy=True, cascade='all, delete-orphan'))


class UserGames(db.Model):
    """Association between a user and a game, tracking list membership and favourite status"""
    id: int = db.Column(db.Integer, primary_key=True)
    user_id: int = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    game_id: int = db.Column(db.Integer, db.ForeignKey('game.igdb_id'), nullable=False)
    list_type: str = db.Column(db.String(10), nullable=False)  # 'wishlist' or 'played'
    is_favorite: bool = db.Column(db.Boolean, default=False)  # only valid when list_type is 'played'
    added_at: datetime.datetime = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.datetime.now(datetime.timezone.utc)
    )
    game = db.relationship('Game')

    __table_args__ = (
        db.UniqueConstraint('user_id', 'game_id'),
        db.CheckConstraint("list_type IN ('wishlist', 'played')", name='list_type_values'),
    )
