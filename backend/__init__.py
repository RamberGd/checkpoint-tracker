from flask import Flask, render_template, url_for, redirect, request, Response, jsonify, flash
from flask_login import login_user, logout_user, login_required, current_user
from backend.extensions import db, login_manager
from flask_bcrypt import Bcrypt
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from backend.auth import Signup, LoginForm
from backend.models import User, UserGames, Review, ReplyToReview
import os
import uuid
from werkzeug.utils import secure_filename
from backend.igdb_caching import get_create_game
from backend.igdb import search_games
import ollama
import json
import requests
from backend.chatbot import generate_stream
from backend.deals import get_deals
from backend.api import api as api_blueprint

app = Flask(__name__)
package_dir = os.path.dirname(__file__)
instance_dir = os.path.join(package_dir, 'instance')
os.makedirs(instance_dir, exist_ok=True)
# DB URI is env-overridable: the test suite sets DATABASE_URL=sqlite:///:memory:
# (before importing this module) so tests bind to an in-memory DB at engine
# creation time and can never touch the real instance/database.db. It also makes
# the future move to Postgres a config change rather than a code change.
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_URL', 'sqlite:///' + os.path.join(instance_dir, 'database.db'))
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

db.init_app(app)
bcrypt = Bcrypt(app)
login_manager.init_app(app)

# JSON API consumed by the Next.js frontend (parallel to the HTML routes).
# Registered as a blueprint under /api; see backend/api.py for the rationale.
app.register_blueprint(api_blueprint)

# create tables on startup if not running tests
with app.app_context():
    if not app.config.get('TESTING'):
        try:
            db.create_all()
        except Exception:
            pass

@app.route("/")
def home():
    return render_template('home.html')

@app.route("/login", methods=["GET", "POST"])
def login():
    """
    This function creates a login session and logs in an existing user.

    Users can log in with either their username or email.

    Returns:
        Response: redirect to login page.
    """
    form = LoginForm()
    if form.validate_on_submit():
        username_or_email = form.username_or_email.data
        try:
            # search for a user using either username or email
            user = User.query.filter(
                or_(
                    User.username == username_or_email,
                    User.email == username_or_email
                )
            ).first()
        except SQLAlchemyError:
            app.logger.exception("Something went wrong during login")
            flash('Unexpected error during login. Please try again later.')
            return render_template('login.html', form=form), 500
        except Exception:
            app.logger.exception("Unexpected error during login")
            flash('Unexpected error during login. Please try again later.')
            return render_template('login.html', form=form), 500

        # verifies the password with the stored hash
        try:
            if user and bcrypt.check_password_hash(user.password, form.password.data):
                login_user(user)
                return redirect(url_for('profile'))
            else:
                flash('Invalid username/email or password')
        except Exception:
            app.logger.exception("Error verifying password")
            flash('Login failed. Please try again.')

    return render_template('login.html', form=form)

@app.route("/signup", methods=["GET", "POST"])
def signup():
    """
        This function registers a new user.

        It creates a new user after validating the form submitted by the user and securely hashes the password.

        Returns:
            Response: The signup page or a redirect to the login page.
    """
    form = Signup()

    if form.validate_on_submit():
        #hashing the user's password before storing into the database
        try:
            hashed_password = bcrypt.generate_password_hash(form.password.data)
            new_user = User(username = form.username.data, email = form.email.data, password=hashed_password)
            db.session.add(new_user)
            db.session.commit()
            return redirect(url_for('login'))
        except SQLAlchemyError:
            db.session.rollback()
            app.logger.exception("Something went wrong when creating a new user")
            flash('An error occurred while creating your account. Please try again later.')
            return render_template('signup.html', form=form), 500
        except Exception:
            db.session.rollback()
            app.logger.exception("Unexpected error during signup")
            flash('An unexpected error occurred. Please try again later.')
            return render_template('signup.html', form=form), 500

    #displays errors if the submission fails, to give feedback to the user like "username taken"
    if request.method == 'POST' and form.errors:
        for field_errors in form.errors.values():
            for err in field_errors:
                flash(err)

    return render_template('signup.html', form=form)

@app.route("/dashboard", methods=["GET", "POST"])
@login_required
def dashboard():
    return render_template('dashboard.html')

@app.route("/logout", methods=["GET", "POST"])
@login_required
def logout():
    """
    Logging the user out of the platform.

    Returns:
        Response: Redirect to landing/home page.
    """
    logout_user()
    return redirect(url_for('home'))


@app.route('/game/<int:game_id>', methods=["GET", "POST"])
@login_required
def game(game_id:int):
    """
    Displays detailed information about a specific game and handles game review submissions.

    Calculates the average rating based on past user's ratings and checks the game status in the user's library
    (played, wishlist, favorite).

    This page allows logged in users to:
    - View general information about a specific game (date of release, genre, etc.)
    - Post reviews and ratings for the game
    - View reviews and ratings posted by other users for the same game
    - Checks games to favorites, wishlist and mark as played
    - View current prices of the game across Steam, GOG and Epic via the ITAD API


    Args:
     game_id (int) : The IGDB identifier of the game

    Returns:
        Response: the game page or a redirect after submission of review.
        deals (list): A list of current prices from Steam, GOG and Epic via ITAD, returns empty list if API call fails or no deals.
    """

    try:
        game = get_create_game(game_id)
    except Exception:
        app.logger.exception("Could not load game information", game_id)
        flash('Could not load game details. Please try again later.')
        return render_template('game.html', game=None, reviews=[], avg_rating=None, is_in_wishlist=False, is_played=False, is_favorite=False, deals=[]), 500

    if request.method == "POST":
        rating = float(request.form['rating'])
        comment = request.form['comment']
        try:
            review = Review(user_id=current_user.id, game_id=game.igdb_id, comment=comment, rating=rating)
            db.session.add(review)
            db.session.commit()
            return redirect(url_for('game', game_id=game_id))
        except ValueError:
            flash('Invalid rating value')
            return redirect(url_for('game', game_id=game_id))
        except SQLAlchemyError:
            db.session.rollback()
            app.logger.exception("Could not save the review", game_id)
            flash('Your review could not been saved. Please try again later.')
            return redirect(url_for('game', game_id=game_id))
        except Exception:
            db.session.rollback()
            app.logger.exception("Something went wrong while saving the review", game_id)
            flash('An unexpected error occurred. Please try again later.')
            return redirect(url_for('game', game_id=game_id))

    try:
        # retrieves all reviews associated with this specific game
        reviews = Review.query.filter_by(game_id=game.igdb_id).all() if game and getattr(game, 'igdb_id', None) is not None else []
    except SQLAlchemyError:
        app.logger.exception("Could not load reviews for this game", game_id)
        reviews = []
    except Exception:
        app.logger.exception("Something went wrong while loading the reviews", game_id)
        reviews = []

    # calculating the average rating for the specific game
    avg_rating = None
    if reviews:
        try:
            total_rating = 0
            for review in reviews:
                total_rating += review.rating
            number_of_reviews = len(reviews)
            avg_rating = total_rating / number_of_reviews if number_of_reviews > 0 else None
        except Exception:
            app.logger.exception("Error calculating average rating for game", game_id)
            avg_rating = None

    # determine if the game is in the user's played list (alternatively also for wishlist and favorite)
    try:
        played_entry = UserGames.query.filter_by(user_id=current_user.id, game_id=game_id, list_type="played").first()
        is_played = played_entry is not None
    except Exception:
        app.logger.exception("Error checking if the game is marked as played", current_user.id, game_id)
        is_played = False

    try:
        wishlist_entry = UserGames.query.filter_by(user_id=current_user.id, game_id=game_id, list_type="wishlist").first()
        is_in_wishlist = wishlist_entry is not None
    except Exception:
        app.logger.exception("Error checking if the game is marked as wishlist", current_user.id, game_id)
        is_in_wishlist = False

    try:
        favorite_entry = UserGames.query.filter_by(user_id=current_user.id, game_id=game_id, is_favorite=True).first()
        is_favorite = favorite_entry is not None
    except Exception:
        app.logger.exception("Error checking if the game is marked as favorite", current_user.id, game_id)
        is_favorite = False

    #return render_template('game.html', game=game, reviews = reviews, avg_rating = avg_rating)

    #search ITAD for the game using its title from IGDB and filter out dlcs
    search_res = requests.get(f"https://api.isthereanydeal.com/games/search/v1?key={os.getenv('ITAD_API_KEY')}&title={game.title}")
    games: list = [g for g in search_res.json() if g["type"] == "game"]
    
    #fetching prices

    deals: list = []
    if games:
        price_res = requests.post(
            f"https://api.isthereanydeal.com/games/prices/v3?key={os.getenv('ITAD_API_KEY')}&country=US&shops=61,35,16",
            json=[games[0]["id"]]
        )
        price_data: list = price_res.json()
        deals = price_data[0]["deals"] if price_data else []

    return render_template('game.html', game=game, reviews=reviews, avg_rating=avg_rating, deals=deals)


@app.route('/games/search')
@login_required
def searching_games():
    query_string = request.args.get('q', '').strip()
    if not query_string:
        return jsonify([])
    
    results = search_games(query_string)
    return jsonify(results)

@app.route('/discussion/<int:review_id>')
@login_required
def discussion(review_id:int):
    """
    Display a review discussion allowing the users to reply to reviews in a separate thread

    Args:
        review_id (int) : The ID identifier of the review

    Returns:
        Response: the discussion page for the review with the list of replies to the specific review
    """
    # retrieve the review, otherwise return error 404 if non-existent
    try:
        review = Review.query.get_or_404(review_id)
        replies = ReplyToReview.query.filter_by(review_id=review_id).all()
        return render_template('discussion.html', review=review, replies=replies)
    except SQLAlchemyError:
        app.logger.exception("Could not load discussion", review_id)
        flash('Could not load discussion. Please try again later.')
        return render_template('discussion.html', review=None, replies=[]), 500
    except Exception:
        app.logger.exception("Something went wrong while loading the discussion", review_id)
        flash('An unexpected error occurred while loading the discussion.')
        return render_template('discussion.html', review=None, replies=[]), 500

@app.route('/reply/<int:review_id>', methods=["POST"])
@login_required
def reply(review_id:int):
    """
    Reply to a specific review in discussion.

    Args:
        review_id (int) : The ID identifier of the review that is being replied to

    Returns:
        Response: Redirect to the discussion page
    """
    # retrieve the reply text submitted by the user
    try:
        comment = request.form.get('comment')
        if comment is None:
            flash('Reply content missing')
            return redirect(url_for('discussion', review_id=review_id))

        new_reply = ReplyToReview(review_id=review_id, user_id=current_user.id, comment=comment)
        db.session.add(new_reply)
        db.session.commit()
        return redirect(url_for('discussion', review_id=review_id))
    except SQLAlchemyError:
        db.session.rollback()
        app.logger.exception("Reply could not be saved", review_id)
        flash('Could not save your reply. Please try again later.')
        return redirect(url_for('discussion', review_id=review_id))
    except Exception:
        db.session.rollback()
        app.logger.exception("Unexpected error while saving the reply", review_id)
        flash('An unexpected error occurred. Please try again later.')
        return redirect(url_for('discussion', review_id=review_id))

@app.route('/played/add/<int:game_id>', methods=["POST"])
@login_required
def mark_as_played(game_id:int):
    """
    Add or remove a game from the user's played list.

    If the game already exists in another list, it is then converted to a played entry

    Args:
        game_id (int) : The IGDB identifier of the game being played

    Returns:
        Response: redirect to the game page
    """
    try:
        # check if the user already has an entry for this game
        played_item = UserGames.query.filter_by(user_id=current_user.id, game_id=game_id).first()

        # remove the game if it has been marked as played before
        if played_item and played_item.list_type == "played":
            db.session.delete(played_item)

        # if an entry of this game already exists (e.g. in wishlist), then that game is moved from there to played
        elif played_item:
            played_item.list_type = "played"
            played_item.is_favorite = False

        # if no played entries exist then create a new one
        else:
            played_item = UserGames(user_id=current_user.id, game_id=game_id, list_type="played")
            db.session.add(played_item)

        db.session.commit()
        return redirect(url_for('game', game_id=game_id))
    except SQLAlchemyError:
        db.session.rollback()
        app.logger.exception("Could not update the played game lists", current_user.id, game_id)
        flash('Could not update your game lists. Please try again later.')
        return redirect(url_for('game', game_id=game_id))
    except Exception:
        db.session.rollback()
        app.logger.exception("Unexpected error while updating played status", current_user.id, game_id)
        flash('An unexpected error occurred. Please try again later.')
        return redirect(url_for('game', game_id=game_id))

@app.route('/wishlist/add/<int:game_id>', methods=["POST"])
@login_required
def add_to_wishlist(game_id:int):
    """
    Add or remove a game from the user's wishlist.

    If the game already exists in another list, it is then converted to a wishlist entry

    Args:
        game_id (int) : The IGDB identifier of the game being played

    Returns:
        Response: redirect to the game page
    """
    try:
        wishlist_item = UserGames.query.filter_by(user_id=current_user.id, game_id=game_id).first()

        # the logic here is the same as in the mark_as_played function
        if wishlist_item and wishlist_item.list_type == "wishlist":
            db.session.delete(wishlist_item)
        elif wishlist_item:
            wishlist_item.list_type = "wishlist"
            wishlist_item.is_favorite = False
        else:
            wishlist_item = UserGames(user_id=current_user.id, game_id=game_id, list_type="wishlist")
            db.session.add(wishlist_item)

        db.session.commit()
        return redirect(url_for('game', game_id=game_id))
    except SQLAlchemyError:
        db.session.rollback()
        app.logger.exception("Could not update the wishlist", current_user.id, game_id)
        flash('Could not update your wishlist. Please try again later.')
        return redirect(url_for('game', game_id=game_id))
    except Exception:
        db.session.rollback()
        app.logger.exception("Unexpected error while updating wishlist ", current_user.id, game_id)
        flash('An unexpected error occurred. Please try again later.')
        return redirect(url_for('game', game_id=game_id))

@app.route('/favorite/add/<int:game_id>', methods=["POST"])
@login_required
def add_to_favorite(game_id:int):
    """
    Change a game's favorite status.

    Only games that have been marked as played can be favorites. If the game does not exist in the user's
    personal library, a played entry is created automatically.

    Args:
        game_id (int) : The IGDB identifier of the game being played

    Returns:
        Response: redirect to the game page
    """
    try:
        favorite_item = UserGames.query.filter_by(user_id=current_user.id, game_id=game_id).first()
        if favorite_item and favorite_item.is_favorite:
            favorite_item.is_favorite = False
        elif favorite_item:
            favorite_item.list_type = "played"
            favorite_item.is_favorite = True
        else:
            favorite_item = UserGames(user_id=current_user.id, game_id=game_id, list_type="played", is_favorite=True)
            db.session.add(favorite_item)

        db.session.commit()
        return redirect(url_for('game', game_id=game_id))
    except SQLAlchemyError:
        db.session.rollback()
        app.logger.exception("Could not update favorite status", current_user.id, game_id)
        flash('Could not update favorite status. Please try again later.')
        return redirect(url_for('game', game_id=game_id))
    except Exception:
        db.session.rollback()
        app.logger.exception("Unexpected error while updating favorite", current_user.id, game_id)
        flash('An unexpected error occurred. Please try again later.')
        return redirect(url_for('game', game_id=game_id))

@app.route('/wishlist')
@login_required
def wishlist():
    """
    This function displays all the games in the user's wishlist.

    Returns:
        The rendered wishlist page
    """
    games = UserGames.query.filter_by(user_id=current_user.id, list_type = "wishlist").all()
    return render_template('wishlist.html', games = games)

@app.route('/played')
@login_required
def played():
    """
    This function displays all the games in the user marked as played.

    Returns:
        The rendered played page.
    """
    games = UserGames.query.filter_by(user_id=current_user.id, list_type = "played").all()
    return render_template('played.html', games = games)

@app.route('/favorites')
@login_required
def favorites():
    """
    This function displays all the games marked as favorites by the user.

    Returns:
        The rendered favorites page.
    """
    games = UserGames.query.filter_by(user_id=current_user.id, list_type = "played", is_favorite = True).all()
    return render_template('favorites.html', games = games)

@app.route("/chat", methods=["GET", "POST"])
@login_required
def chat():
    """Render the chat UI and handle LLM message streaming

    GET: renders the chat page.
    POST: accepts a JSON body with a messages list, prepends the system
          prompt, and streams the LLM response back as Server-Sent Events.

    Returns:
        GET: rendered chat.html template
        POST: either response or a 400 JSON error if the payload is invalid
    """
    if request.method == "GET":
        return render_template('chat.html')

    # extract conversation history sent by the client
    incoming_history: list = request.get_json().get('messages', [])

    if not incoming_history or not isinstance(incoming_history, list):
        return jsonify({"error": "Payload validation failed"}), 400

    # prepend the system prompt and strip any client-supplied system messages
    # to prevent prompt injection via the request body
    final_session_messages: list[dict] = [
        {'role': 'system', 'content': 'You are a helpful web assistant focused on video games.'}
    ] + [msg for msg in incoming_history if msg.get('role') != 'system']

    return Response(generate_stream(final_session_messages), mimetype='text/event-stream')


@app.route('/profile', methods=["GET"])
@login_required
def profile():
    """Render the current user's profile page with their games and reviews"""
    wishlist_shortlist = UserGames.query.filter_by(user_id=current_user.id, list_type='wishlist').order_by(UserGames.added_at.desc()).limit(5).all()
    favourites_shortlist = UserGames.query.filter_by(user_id=current_user.id, is_favorite=True).order_by(UserGames.added_at.desc()).limit(5).all()
    played_shortlist = UserGames.query.filter_by(user_id=current_user.id, list_type='played').order_by(UserGames.added_at.desc()).limit(5).all()
    user_reviews = Review.query.filter_by(user_id=current_user.id).all()

    return render_template('profile.html', user=current_user, wishlist_shortlist=wishlist_shortlist, favourites_shortlist=favourites_shortlist, played_shortlist=played_shortlist, user_reviews=user_reviews)


@app.route('/profile/edit', methods=["GET", "POST"])
@login_required
def edit_profile():
    """Render and handle the edit profile form (username + profile picture)

    GET: renders the form pre-filled with the current user's data.
    POST: validates and applies username and/or profile picture changes.
          Flashes an error and re-renders on validation or DB failure
    """
    if request.method == "POST":
        new_username = request.form.get('username', '').strip()
        new_photo = request.files.get('profile_pic')
        if new_username:
            existing = User.query.filter_by(username=new_username).first()
            if existing and existing.id != current_user.id:
                flash('A user with this username already exists')
                return render_template('edit_profile.html', user=current_user)
            else:
                current_user.username = new_username
        if new_photo and new_photo.filename:
            safe_name = secure_filename(new_photo.filename)
            if not safe_name:
                flash('Invalid filename.')
                return render_template('edit_profile.html', user=current_user)
            ext = os.path.splitext(safe_name)[1].lower()
            if ext not in ('.jpg', '.jpeg', '.png', '.gif'):
                flash('Invalid file type. Please upload an image file.')
                return render_template('edit_profile.html', user=current_user)
            unique_name = f"{uuid.uuid4().hex}{ext}"
            new_photo.save(os.path.join(package_dir, 'static/uploads', unique_name))
            current_user.profile_pic = unique_name
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            flash('An error occurred while updating your profile. Please try again.')
            return render_template('edit_profile.html', user=current_user)
        return redirect(url_for('profile'))


    return render_template('edit_profile.html', user=current_user)

@app.route('/sales')
@login_required
def sales() -> str:
    """
    This shows the sales page with most popular games that have discounts,
    the games are retrieved through ITAD based on their collection counts.
    There are totally 50 games retrieved, and 5 are randomly selected and shown, this changes with refreshing. 

    Returns:
        str: It renders the sales page with the deal information
    """
    data: list = get_deals()
    return render_template('sales.html', deals=data)


@app.route('/prices/<int:game_id>')
@login_required
def prices(game_id: int):
    """Fetch and display current prices for a game from the ITAD API.

    Looks up the game by IGDB ID, searches ITAD by title, then retrieves
    prices from Steam, GOG, and Epic 

    Args:
        game_id: The IGDB integer ID of the game.

    Returns:
        Rendered game.html with deals list filled in, or an empty deals list
        if the game is not found on ITAD or the API call fails.
    """
    game = get_create_game(game_id)
    title = game.title
    
    search_res = requests.get(f"https://api.isthereanydeal.com/games/search/v1?key={os.getenv('ITAD_API_KEY')}&title={title}")
    games = [g for g in search_res.json() if g["type"] == "game"]
    
    if not games:
        return render_template('game.html', game=game, deals=[], reviews=[], avg_rating=None)
    
    price_res = requests.post(
        f"https://api.isthereanydeal.com/games/prices/v3?key={os.getenv('ITAD_API_KEY')}&country=US&shops=61,35,16",
        json=[games[0]["id"]]
    )
    price_data = price_res.json()
    deals = price_data[0]["deals"] if price_data else []
    
    return render_template('game.html', game=game, deals=deals, reviews=[], avg_rating=None)

@app.route('/review/delete/<int:review_id>', methods=["POST"])
@login_required
def delete_review(review_id: int):
    """Delete a review owned by the current user and redirect to the game page.

    Only the review's author may delete it. Deletes all replies via the
    relationship defined in models. Flashes an error and redirects
    without deleting if the DB operation fails.

    Args:
        review_id: ID of the review to delete.
    """
    review = Review.query.get_or_404(review_id)
    if review.user_id != current_user.id:
        flash("You are not authorized to delete this review.")
        return redirect(url_for('game', game_id=review.game_id))

    try:
        db.session.delete(review)
        db.session.commit()
        flash("Review deleted successfully.")
    except Exception:
        db.session.rollback()
        flash("Something went wrong while deleting your review. Please try again.")
    return redirect(url_for('game', game_id=review.game_id))

@app.route('/reply/delete/<int:reply_id>', methods=["POST"])
@login_required
def delete_reply(reply_id: int):
    """Delete a reply owned by the current user and redirect to the discussion page.

    Only the reply's author may delete it. Flashes an error and redirects
    without deleting if the DB operation fails.

    Args:
        reply_id: ID of the reply to delete.
    """
    reply = ReplyToReview.query.get_or_404(reply_id)
    if reply.user_id != current_user.id:
        flash("You are not authorized to delete this reply.")
        return redirect(url_for('discussion', review_id=reply.review_id))

    review_id = reply.review_id
    try:
        db.session.delete(reply)
        db.session.commit()
        flash("Reply deleted successfully.")
    except Exception:
        db.session.rollback()
        flash("Something went wrong while deleting your reply. Please try again.")
    return redirect(url_for('discussion', review_id=review_id))

if __name__ == "__main__":
    app.run(debug=True)
