from backend import Review, UserGames, db, ReplyToReview

"""Helpers to create a new user via signup and login"""
def signup(client, username, email, password, confirm):
    return client.post(
        '/signup', data={
        'username': username,
        'email': email,
        'password': password,
        'confirm': confirm
    }, follow_redirects=True)


def login(client, username_or_email, password):
    return client.post('/login', data={
        'username_or_email': username_or_email,
        'password': password
    }, follow_redirects=True)


def new_user(client):
    signup(client, 'bob', 'bob@gmail.com', 'bobby123', 'bobby123')
    login(client, 'bob', 'bobby123')


class TestGamePage:
    def test_game_page_loading(self, client):
        """Test that the game page loads successfully for an authenticated user"""
        new_user(client)
        response = client.get('/game/3008')
        assert response.status_code == 200
        assert b'Game' in response.data

    def test_post_review(self, client):
        """A logged in user can submit a review and it is saved to the database"""
        new_user(client)
        response = client.post('/game/3008', data={'rating': '5', 'comment': 'I loved this game'},
                               follow_redirects=True)
        assert response.status_code == 200
        review = Review.query.filter_by(comment='I loved this game').first()
        assert review is not None
        assert review.rating == 5

    def test_review_on_page(self, client):
        """A submitted review appears on the game page when it is reloaded"""
        new_user(client)
        client.post('/game/3008', data={'rating': '4', 'comment': 'Nice game'},
                    follow_redirects=True)
        response = client.get('/game/3008')
        assert response.status_code == 200
        assert b'Nice game' in response.data


class TestPlayed:
    def test_mark_as_played(self, client):
        """played/add marks a game as played in the user's library."""
        new_user(client)
        client.post('/played/add/3008')
        game = UserGames.query.filter_by(game_id=3008, list_type='played').first()
        assert game is not None

    def test_mark_as_unplayed(self, client):
        """played/add a second time removes the game from the played list"""
        new_user(client)
        client.post('/played/add/3008')
        client.post('/played/add/3008')
        game = UserGames.query.filter_by(game_id=3008, list_type='played').first()
        assert game is None

    def test_played_page_loading(self, client):
        """The played list page loads successfully for an authenticated user"""
        new_user(client)
        response = client.get('/played')
        assert response.status_code == 200


class TestWishlist:
    def test_add_to_wishlist(self, client):
        """wishlist/add adds a game to the user's wishlist"""
        new_user(client)
        client.post('/wishlist/add/3008')
        game = UserGames.query.filter_by(game_id=3008, list_type='wishlist').first()
        assert game is not None

    def test_remove_from_wishlist(self, client):
        """wishlist/add a second time removes the game from the wishlist"""
        new_user(client)
        client.post('/wishlist/add/3008')
        client.post('/wishlist/add/3008')
        game = UserGames.query.filter_by(game_id=3008, list_type='wishlist').first()
        assert game is None

    def test_wishlist_page_loading(self, client):
        """The wishlist page loads successfully for an authenticated user"""
        new_user(client)
        response = client.get('/wishlist')
        assert response.status_code == 200


class TestFavorite:
    def test_add_to_favorite(self, client):
        """favorite/add marks a game as a favourite"""
        new_user(client)
        client.post('/favorite/add/3008')
        game = UserGames.query.filter_by(game_id=3008).first()
        assert game.is_favorite == True

    def test_remove_from_favorite(self, client):
        """favorite/add a second time removes the game from favourites"""
        new_user(client)
        client.post('/favorite/add/3008')
        client.post('/favorite/add/3008')
        game = UserGames.query.filter_by(game_id=3008).first()
        assert game.is_favorite == False

    def test_favorites_page_loading(self, client):
        """The favourites page loads successfully for an authenticated user"""
        new_user(client)
        response = client.get('/favorites')
        assert response.status_code == 200


class TestDiscussion:
    def test_discussion_page_loading(self, client):
        """The discussion page for a review loads successfully."""
        new_user(client)
        review = Review(user_id=1, game_id=3008, rating=5, comment='Fun game')
        db.session.add(review)
        db.session.commit()
        response = client.get(f'/discussion/{review.id}')
        assert response.status_code == 200

    def test_reply_user(self, client):
        """A logged in user can post a reply to a review; it is saved to the database"""
        new_user(client)
        review = Review(user_id=1, game_id=3008, rating=5, comment='Fun game')
        db.session.add(review)
        db.session.commit()
        response = client.post(f'/reply/{review.id}', data={'comment': 'I think this game was not so fun'},
                               follow_redirects=True)
        assert response.status_code == 200
        reply = ReplyToReview.query.filter_by(comment='I think this game was not so fun').first()
        assert reply is not None


class TestRequiredAuthentification:
    def test_game_requires_login(self, client):
        """unauthenticated access to a game page is redirected"""
        response = client.get('/game/3008')
        assert response.status_code == 302

    def test_wishlist_requires_login(self, client):
        """unauthenticated access to the wishlist page is redirected"""
        response = client.get('/wishlist')
        assert response.status_code == 302

    def test_played_requires_login(self, client):
        """Unauthenticated access to the played page is redirected"""
        response = client.get('/played')
        assert response.status_code == 302

    def test_favorites_requires_login(self, client):
        """Unauthenticated access to the favourites page is redirected."""
        response = client.get('/favorites')
        assert response.status_code == 302
