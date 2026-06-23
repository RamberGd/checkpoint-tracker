from backend.extensions import db
from backend.models import Review, Game, User, ReplyToReview


def test_delete_own_review(logged_in_client, test_user):
    """A user can delete their own review and it is removed from the database"""
    game = Game(igdb_id=9999, title='Test Game')
    db.session.add(game)
    db.session.commit()

    review = Review(user_id=test_user, game_id=game.igdb_id, rating=5.0)
    db.session.add(review)
    db.session.commit()

    response = logged_in_client.post(f'/review/delete/{review.id}')
    assert response.status_code == 302
    assert db.session.get(Review, review.id) is None


def test_delete_other_users_review(logged_in_client, test_user):
    """A user cannot delete another user's review. When trying, the review remains in the database"""
    from flask_bcrypt import Bcrypt
    bcrypt = Bcrypt()
    test_user_2 = User(
        username='testuser2',
        email='test2@test.com',
        password=bcrypt.generate_password_hash('password123')
    )
    db.session.add(test_user_2)
    db.session.commit()

    game = Game(igdb_id=9998, title='Test Game 2')
    db.session.add(game)
    db.session.commit()

    review = Review(user_id=test_user_2.id, game_id=game.igdb_id, rating=5.0)
    db.session.add(review)
    db.session.commit()

    response = logged_in_client.post(f'/review/delete/{review.id}')
    assert response.status_code == 302
    assert db.session.get(Review, review.id) is not None


def test_delete_reply(logged_in_client, test_user):
    """A user can delete their own reply, it is removed while the parent review remains"""
    game = Game(igdb_id=9997, title='Test Game 5')
    db.session.add(game)
    db.session.commit()

    review = Review(user_id=test_user, game_id=game.igdb_id, rating=5.0)
    db.session.add(review)
    db.session.commit()

    reply = ReplyToReview(user_id=test_user, review_id=review.id, comment='test reply')
    db.session.add(reply)
    db.session.commit()

    response = logged_in_client.post(f'/reply/delete/{reply.id}')
    assert response.status_code == 302
    assert db.session.get(ReplyToReview, reply.id) is None
    assert db.session.get(Review, review.id) is not None


def test_delete_other_users_reply(logged_in_client, test_user):
    """A user cannot delete another user's reply, the reply remains in the database"""
    from flask_bcrypt import Bcrypt
    bcrypt = Bcrypt()
    test_user_3 = User(
        username='testuser3',
        email='test3@test.com',
        password=bcrypt.generate_password_hash('password123')
    )
    db.session.add(test_user_3)
    db.session.commit()

    game = Game(igdb_id=9996, title='Test Game 3')
    db.session.add(game)
    db.session.commit()

    review = Review(user_id=test_user_3.id, game_id=game.igdb_id, rating=5.0)
    db.session.add(review)
    db.session.commit()

    reply = ReplyToReview(user_id=test_user_3.id, review_id=review.id, comment='test reply')
    db.session.add(reply)
    db.session.commit()

    response = logged_in_client.post(f'/reply/delete/{reply.id}')
    assert response.status_code == 302
    assert db.session.get(ReplyToReview, reply.id) is not None


def test_delete_review_removes_replies(logged_in_client, test_user):
    """Deleting a review deletes it with all of its replies"""
    game = Game(igdb_id=9995, title='Test Game 4')
    db.session.add(game)
    db.session.commit()

    review = Review(user_id=test_user, game_id=game.igdb_id, rating=5.0)
    db.session.add(review)
    db.session.commit()

    reply = ReplyToReview(user_id=test_user, review_id=review.id, comment='test reply')
    db.session.add(reply)
    db.session.commit()

    response = logged_in_client.post(f'/review/delete/{review.id}')
    assert response.status_code == 302
    assert db.session.get(Review, review.id) is None
    assert db.session.get(ReplyToReview, reply.id) is None
