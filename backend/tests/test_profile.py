from backend.models import Game, User, UserGames
from backend.extensions import db


def test_require_login(client):
    """Unauthenticated requests to profile are redirected to the login page"""
    response = client.get('/profile')
    assert response.status_code == 302
    assert '/login' in response.headers['Location']


def test_profile_page(logged_in_client):
    """Authenticated user can load the profile page successfully"""
    response = logged_in_client.get('/profile')
    assert response.status_code == 200


def test_edit_profile_page(logged_in_client):
    """Authenticated user can load the edit profile page successfully"""
    response = logged_in_client.get('/profile/edit')
    assert response.status_code == 200


def test_username_displayed(logged_in_client, test_user):
    """The current user's username appears on their profile page"""
    response = logged_in_client.get('/profile')
    assert b'testuser' in response.data


def test_favourite_appears_in_profile(logged_in_client, test_user):
    """A game marked as favourite appears in the favourites section of the profile"""
    game = Game(igdb_id=1111, title='Test')
    db.session.add(game)
    db.session.commit()
    user_game = UserGames(user_id=test_user, game_id=game.igdb_id, list_type='played', is_favorite=True)
    db.session.add(user_game)
    db.session.commit()
    response = logged_in_client.get('/profile')
    assert b'Test' in response.data


def test_wishlist_appears_in_profile(logged_in_client, test_user):
    """A game on the wishlist appears on the profile page"""
    game = Game(igdb_id=1112, title='Test 2')
    db.session.add(game)
    db.session.commit()
    user_game = UserGames(user_id=test_user, game_id=game.igdb_id, list_type='wishlist', is_favorite=False)
    db.session.add(user_game)
    db.session.commit()
    response = logged_in_client.get('/profile')
    assert b'Test 2' in response.data


def test_played_appears_in_profile(logged_in_client, test_user):
    """A game marked as played appears on the profile page"""
    game = Game(igdb_id=1113, title='Test 3')
    db.session.add(game)
    db.session.commit()
    user_game = UserGames(user_id=test_user, game_id=game.igdb_id, list_type='played', is_favorite=False)
    db.session.add(user_game)
    db.session.commit()
    response = logged_in_client.get('/profile')
    assert b'Test 3' in response.data


def test_played_not_in_favourites(logged_in_client, test_user):
    """A game marked as played but not favourite does not appear in the favourites section"""
    game = Game(igdb_id=1114, title='Test 4')
    db.session.add(game)
    db.session.commit()
    user_game = UserGames(user_id=test_user, game_id=game.igdb_id, list_type='played', is_favorite=False)
    db.session.add(user_game)
    db.session.commit()
    response = logged_in_client.get('/profile')
    html = response.data.decode()
    fav_section = html[html.find('id="favourites-section"'):html.find('id="played-section"')]
    assert 'Test 4' not in fav_section


def test_username_update(logged_in_client, test_user):
    """Submitting a new username via the edit form updates it in the database"""
    response = logged_in_client.post('/profile/edit', data={
        'username': 'newname',
    }, follow_redirects=True)
    assert response.status_code == 200
    updated_user = db.session.query(User).filter_by(id=test_user).first()
    assert updated_user.username == 'newname'
    assert b'newname' in response.data


def test_reject_duplicate_username(logged_in_client, test_user):
    """Submitting a username already taken by another user is rejected with an error message"""
    from flask_bcrypt import Bcrypt
    bcrypt = Bcrypt()
    existing_user = User(
        username='testuser2',
        email='test2@test.com',
        password=bcrypt.generate_password_hash('password123')
    )
    db.session.add(existing_user)
    db.session.commit()

    response = logged_in_client.post('/profile/edit', data={
        'username': 'testuser2',
    }, follow_redirects=True)
    assert db.session.query(User).filter_by(id=test_user).first().username != 'testuser2'
    assert b'already exists' in response.data
