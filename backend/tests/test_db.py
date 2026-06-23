from backend.models import Game, Review, UserGames


def test_game_creation(client):
    """A Game record can be created and retrieved by igdb_id"""
    from backend.extensions import db
    game = Game(igdb_id=1234, title='Elden Ring')
    db.session.add(game)
    db.session.commit()
    assert Game.query.filter_by(igdb_id=1234).first().title == 'Elden Ring'


def test_one_review_per_user(client, test_user):
    """A user cannot submit more than one review for the same game"""
    from backend.extensions import db
    import pytest
    from sqlalchemy.exc import IntegrityError
    game = Game(igdb_id=1, title='Test Game')
    db.session.add(game)
    db.session.commit()
    r1 = Review(user_id=test_user, game_id=game.igdb_id, rating=4.0)
    r2 = Review(user_id=test_user, game_id=game.igdb_id, rating=3.0)
    db.session.add_all([r1, r2])
    with pytest.raises(IntegrityError):
        db.session.commit()
