"""JSON API blueprint consumed by the Next.js frontend.

WHY THIS EXISTS
---------------
The original app is server-rendered: its routes return Jinja templates,
redirects and `flash()` messages, and authenticate via a Flask-Login session
cookie. The Next.js frontend instead needs machine-readable JSON and a
cookie-based session it can drive over `fetch`.

Rather than rewrite the working HTML routes (and their test suite), this
blueprint adds a *parallel* JSON layer under `/api`. The Next.js dev server
proxies `/api/*` to this blueprint (see frontend/next.config.ts), so from the
browser everything is same-origin — the Flask-Login cookie flows automatically
and no CORS is required.

It reuses the existing models, IGDB/ITAD clients, the chatbot stream and the
`Signup` form validators, so business rules and error messages stay in one
place. Every endpoint returns either the payload (2xx) or `{"error": str,
"fields"?: {...}}` (4xx/5xx) — the same error strings the templates flash.
"""
import datetime
import os
import uuid

import cloudinary
import cloudinary.uploader
import requests
from flask import Blueprint, jsonify, request, redirect, url_for, Response, current_app
from werkzeug.utils import secure_filename
from flask_login import login_user, logout_user, login_required, current_user
from flask_bcrypt import generate_password_hash, check_password_hash
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from backend.extensions import db, login_manager
from backend.models import User, Game, UserGames, Review, ReplyToReview
from backend.auth import Signup
from backend.igdb_caching import get_create_game
from backend.igdb import search_games
from rapidfuzz import fuzz
from backend.chatbot import generate_stream
from backend.deals import get_deals

api = Blueprint("api", __name__, url_prefix="/api")

# Directory of this package, used to resolve the static/uploads folder for
# avatar saves (mirrors the path logic in backend/__init__.py).
package_dir = os.path.dirname(__file__)

# ITAD shop ids the frontend price grid expects, in display order.
ITAD_SHOPS = [("Steam", 61), ("GOG", 35), ("Epic Games", 16)]


# ── Auth gate: JSON for the API, redirect for the HTML app ────────────
@login_manager.unauthorized_handler
def _handle_unauthorized():
    """Return 401 JSON for API calls; preserve the redirect for HTML routes.

    Flask-Login calls a single global unauthorized handler. The HTML app relies
    on the default "redirect to the login page" behavior, so we keep that for
    every non-/api path and only switch to a 401 JSON body for the SPA, which
    has no use for an HTML redirect.
    """
    if request.path.startswith("/api"):
        return jsonify({"error": "Authentication required"}), 401
    return redirect(url_for("login"))


# ── Blueprint error handlers: keep API failures as JSON ───────────────
@api.errorhandler(404)
def _api_404(_err):
    # get_create_game aborts 404 when IGDB has no game for the requested id.
    return jsonify({"error": "Game not found."}), 404


@api.errorhandler(503)
def _api_503(_err):
    # get_create_game aborts 503 when the IGDB API is unreachable.
    return jsonify({"error": "Game service is temporarily unavailable."}), 503


# ── Serializers ───────────────────────────────────────────────────────
def _avatar_url(user: User):
    """Map the stored filename to a same-origin path the frontend can load.

    The frontend rewrites `/uploads/*` to Flask's static/uploads folder, so we
    hand back a relative path (or null to let the UI use its default avatar).
    """
    if not user.profile_pic:
        return None
    if user.profile_pic.startswith("http"):
        return user.profile_pic
    return f"/uploads/{user.profile_pic}"


def _me_payload(user: User) -> dict:
    """Identity + list/review counts — the session bootstrap shape (`/api/me`)."""
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "avatarUrl": _avatar_url(user),
        "counts": {
            "played": UserGames.query.filter_by(user_id=user.id, list_type="played").count(),
            "wishlist": UserGames.query.filter_by(user_id=user.id, list_type="wishlist").count(),
            "reviews": Review.query.filter_by(user_id=user.id).count(),
        },
    }


def _game_summary(user_game: UserGames) -> dict:
    """A UserGames row reduced to what a cover grid needs ({id,title,cover})."""
    g = user_game.game
    return {
        "id": user_game.game_id,  # IGDB id — used directly in /game/[id] routes
        "title": g.title if g else "Unknown",
        "cover": g.cover_url if g else None,
    }


def _review_dto(review: Review) -> dict:
    """A review as the game page / profile expects it."""
    return {
        "id": review.id,
        "username": review.user.username if review.user else "Unknown",
        "rating": review.rating,
        "comment": review.comment or "",
        "replyCount": len(review.replies),
        "isOwn": current_user.is_authenticated and review.user_id == current_user.id,
    }


def _list_status(game_id: int) -> dict:
    """The three library-membership flags the game page toggles reflect."""
    played = UserGames.query.filter_by(
        user_id=current_user.id, game_id=game_id, list_type="played"
    ).first() is not None
    wishlisted = UserGames.query.filter_by(
        user_id=current_user.id, game_id=game_id, list_type="wishlist"
    ).first() is not None
    favourited = UserGames.query.filter_by(
        user_id=current_user.id, game_id=game_id, is_favorite=True
    ).first() is not None
    return {"played": played, "wishlisted": wishlisted, "favourited": favourited}


# ── Auth ──────────────────────────────────────────────────────────────
@api.route("/me", methods=["GET"])
@login_required
def me():
    """Session bootstrap: who is logged in (used by the frontend AuthContext)."""
    return jsonify(_me_payload(current_user))


@api.route("/login", methods=["POST"])
def login():
    """Authenticate by username OR email and start a session.

    Mirrors the HTML /login route, but returns the user as JSON instead of
    redirecting, and a 401 with the same flash text on bad credentials.
    """
    data = request.get_json(silent=True) or {}
    identifier = (data.get("username_or_email") or "").strip()
    password = data.get("password") or ""
    if not identifier or not password:
        return jsonify({"error": "Username/email and password are required."}), 400

    try:
        user = User.query.filter(
            or_(User.username == identifier, User.email == identifier)
        ).first()
    except SQLAlchemyError:
        current_app.logger.exception("DB error during API login")
        return jsonify({"error": "Unexpected error during login. Please try again later."}), 500

    if user and check_password_hash(user.password, password):
        login_user(user)
        return jsonify(_me_payload(user))
    return jsonify({"error": "Invalid username/email or password"}), 401


@api.route("/signup", methods=["POST"])
def signup():
    """Register a new account, reusing the Signup form's validators.

    Constructing the WTForm with `meta={"csrf": False}` runs the exact same
    length/uniqueness/confirmation checks (and their messages) the HTML form
    uses, so the two paths can never drift apart. Field errors are returned
    keyed by field name so the frontend can show them inline.
    """
    data = request.get_json(silent=True) or {}
    form = Signup(data=data, meta={"csrf": False})
    if not form.validate():
        fields = {field: errs[0] for field, errs in form.errors.items() if errs}
        return jsonify({"error": "Please fix the highlighted fields.", "fields": fields}), 400

    try:
        hashed = generate_password_hash(form.password.data)
        user = User(username=form.username.data, email=form.email.data, password=hashed)
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        # Lost a uniqueness race after validation — report it on both fields.
        return jsonify({
            "error": "That username or email is already taken.",
            "fields": {"username": "Already taken", "email": "Already taken"},
        }), 409
    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception("DB error during API signup")
        return jsonify({"error": "An error occurred while creating your account."}), 500

    # Log the new user straight in so the SPA lands on a real session.
    login_user(user)
    return jsonify(_me_payload(user)), 201


@api.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return ("", 204)


@api.route("/profile/edit", methods=["POST"])
@login_required
def edit_profile():
    """Update username and/or avatar (multipart form), reusing the HTML rules.

    Same validation as the template route: username uniqueness, and an image
    extension whitelist for the uploaded file. Returns the refreshed user so
    the frontend can update its AuthContext without a second round-trip.
    """
    new_username = (request.form.get("username") or "").strip()
    new_photo = request.files.get("profile_pic")

    if new_username:
        existing = User.query.filter_by(username=new_username).first()
        if existing and existing.id != current_user.id:
            return jsonify({
                "error": "A user with this username already exists",
                "fields": {"username": "A user with this username already exists"},
            }), 409
        current_user.username = new_username

    if new_photo and new_photo.filename:
        safe_name = secure_filename(new_photo.filename)
        if not safe_name:
            return jsonify({"error": "Invalid filename."}), 400
        ext = os.path.splitext(safe_name)[1].lower()
        if ext not in (".jpg", ".jpeg", ".png", ".gif"):
            return jsonify({"error": "Invalid file type. Please upload an image file."}), 400
        try:
            result = cloudinary.uploader.upload(
                new_photo,
                public_id=uuid.uuid4().hex,
                overwrite=True,
                resource_type="image",
            )
            current_user.profile_pic = result["secure_url"]
        except Exception:
            current_app.logger.exception("Cloudinary upload failed")
            return jsonify({"error": "Image upload failed. Please try again."}), 500

    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception("DB error during API profile edit")
        return jsonify({"error": "An error occurred while updating your profile. Please try again."}), 500

    return jsonify(_me_payload(current_user))


# ── Profile / library lists ───────────────────────────────────────────
@api.route("/profile", methods=["GET"])
@login_required
def profile():
    """The profile page payload: 5-item shortlists per list + all reviews."""
    wishlist = (UserGames.query
                .filter_by(user_id=current_user.id, list_type="wishlist")
                .order_by(UserGames.added_at.desc()).limit(5).all())
    favourites = (UserGames.query
                  .filter_by(user_id=current_user.id, is_favorite=True)
                  .order_by(UserGames.added_at.desc()).limit(5).all())
    played = (UserGames.query
              .filter_by(user_id=current_user.id, list_type="played")
              .order_by(UserGames.added_at.desc()).limit(5).all())
    reviews = Review.query.filter_by(user_id=current_user.id).all()

    return jsonify({
        "user": _me_payload(current_user),
        "wishlist": [_game_summary(g) for g in wishlist],
        "favourites": [_game_summary(g) for g in favourites],
        "played": [_game_summary(g) for g in played],
        "reviews": [
            {
                "id": r.id,
                "gameId": r.game_id,
                "gameTitle": r.game.title if r.game else "Unknown",
                "cover": r.game.cover_url if r.game else None,
                "rating": r.rating,
                "comment": r.comment or "",
            }
            for r in reviews
        ],
    })


@api.route("/lists/<list_kind>", methods=["GET"])
@login_required
def get_list(list_kind: str):
    """Full played / wishlist / favourites lists for the dedicated pages.

    'favourites' is not a list_type — it's the is_favorite flag on played rows,
    so it is queried differently from the other two.
    """
    if list_kind == "favourites":
        rows = (UserGames.query
                .filter_by(user_id=current_user.id, list_type="played", is_favorite=True)
                .order_by(UserGames.added_at.desc()).all())
    elif list_kind in ("played", "wishlist"):
        rows = (UserGames.query
                .filter_by(user_id=current_user.id, list_type=list_kind)
                .order_by(UserGames.added_at.desc()).all())
    else:
        return jsonify({"error": "Unknown list."}), 404

    return jsonify([_game_summary(g) for g in rows])


# ── Games ─────────────────────────────────────────────────────────────
@api.route("/games/search", methods=["GET"])
@login_required
def search():
    """Normalize IGDB search results to the SearchOverlay's shape.

    IGDB always returns `id` plus the requested fields; we flatten the nested
    cover/genre/date into the flat {id,title,year,genre,cover} the UI uses, and
    upscale the cover thumbnail the same way the cache does.
    """
    query_string = (request.args.get("q") or "").strip()
    if not query_string:
        return jsonify([])

    offset = max(0, int(request.args.get("offset", 0)))
    raw = search_games(query_string, limit=30, offset=offset)
    # Fallback on first page only: retry with first word if IGDB finds nothing.
    if not raw and offset == 0 and " " in query_string:
        raw = search_games(query_string.split()[0], limit=30, offset=0)

    def _normalize(g: dict) -> dict:
        cover = g.get("cover", {}).get("url") if g.get("cover") else None
        cover = ("https:" + cover.replace("t_thumb", "t_cover_big")) if cover else None
        ts = g.get("first_release_date")
        year = datetime.date.fromtimestamp(ts).year if ts else None
        genres = g.get("genres") or []
        title = g.get("name", "Untitled")
        score = fuzz.partial_ratio(query_string.lower(), title.lower())
        return {
            "id": g["id"],
            "title": title,
            "year": year,
            "genre": genres[0]["name"] if genres else None,
            "cover": cover,
            "_score": score,
        }

    out = sorted((_normalize(g) for g in raw), key=lambda x: (-x["_score"], len(x["title"])))
    for item in out:
        del item["_score"]
    return jsonify(out)


@api.route("/games/<int:game_id>", methods=["GET"])
@login_required
def game(game_id: int):
    """Game detail: cached IGDB data + reviews + average + this user's status."""
    record = get_create_game(game_id)  # aborts 404/503 -> JSON via error handlers

    reviews = Review.query.filter_by(game_id=record.igdb_id).all()
    avg = (sum(r.rating for r in reviews) / len(reviews)) if reviews else None

    return jsonify({
        "id": record.igdb_id,
        "title": record.title,
        "summary": record.summary,
        "cover": record.cover_url,
        "genres": record.genres.split(",") if record.genres else [],
        "releaseDate": record.release_date.isoformat() if record.release_date else None,
        "avgRating": avg,
        "reviews": [_review_dto(r) for r in reviews],
        "status": _list_status(game_id),
    })


@api.route("/games/<int:game_id>/prices", methods=["GET"])
@login_required
def prices(game_id: int):
    """Current Steam/GOG/Epic prices via ITAD, normalized for the price grid.

    The grid always shows the three canonical shops, so missing shops are
    returned as available:false rather than omitted. Any ITAD failure degrades
    to all-unavailable instead of erroring the page.
    """
    record = get_create_game(game_id)
    key = os.getenv("ITAD_API_KEY")

    deals_by_shop_id: dict = {}
    try:
        search_res = requests.get(
            f"https://api.isthereanydeal.com/games/search/v1?key={key}&title={record.title}",
            timeout=10,
        )
        matches = [g for g in search_res.json() if g.get("type") == "game"]
        if matches:
            price_res = requests.post(
                f"https://api.isthereanydeal.com/games/prices/v3?key={key}&country=US&shops=61,35,16",
                json=[matches[0]["id"]],
                timeout=10,
            )
            price_data = price_res.json()
            for d in (price_data[0]["deals"] if price_data else []):
                deals_by_shop_id[d["shop"]["id"]] = d
    except (requests.exceptions.RequestException, KeyError, ValueError):
        current_app.logger.exception("ITAD price lookup failed for game %s", game_id)
        deals_by_shop_id = {}

    out = []
    for label, shop_id in ITAD_SHOPS:
        d = deals_by_shop_id.get(shop_id)
        if d:
            out.append({
                "shop": label,
                "price": d["price"]["amount"],
                "originalPrice": d["regular"]["amount"],
                "cut": d["cut"],
                "available": True,
                "url": d.get("url", ""),
            })
        else:
            out.append({
                "shop": label, "price": 0, "originalPrice": 0,
                "cut": 0, "available": False, "url": "",
            })
    return jsonify(out)


def _toggle_response(game_id: int):
    """Commit a list change and return the refreshed three-flag status."""
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception("DB error toggling list for game %s", game_id)
        return jsonify({"error": "Could not update your game lists. Please try again later."}), 500
    return jsonify(_list_status(game_id))


@api.route("/games/<int:game_id>/played", methods=["POST"])
@login_required
def toggle_played(game_id: int):
    """Toggle 'played'. Same semantics as the HTML route: a game lives in one
    list, so an existing wishlist entry is converted rather than duplicated."""
    get_create_game(game_id)  # ensure the Game row exists for the FK
    item = UserGames.query.filter_by(user_id=current_user.id, game_id=game_id).first()
    if item and item.list_type == "played":
        db.session.delete(item)
    elif item:
        item.list_type = "played"
        item.is_favorite = False
    else:
        db.session.add(UserGames(user_id=current_user.id, game_id=game_id, list_type="played"))
    return _toggle_response(game_id)


@api.route("/games/<int:game_id>/wishlist", methods=["POST"])
@login_required
def toggle_wishlist(game_id: int):
    get_create_game(game_id)
    item = UserGames.query.filter_by(user_id=current_user.id, game_id=game_id).first()
    if item and item.list_type == "wishlist":
        db.session.delete(item)
    elif item:
        item.list_type = "wishlist"
        item.is_favorite = False
    else:
        db.session.add(UserGames(user_id=current_user.id, game_id=game_id, list_type="wishlist"))
    return _toggle_response(game_id)


@api.route("/games/<int:game_id>/favorite", methods=["POST"])
@login_required
def toggle_favorite(game_id: int):
    """Toggle 'favourite'. Favourites are played games, so favouriting also
    marks the game played (matching the HTML route)."""
    get_create_game(game_id)
    item = UserGames.query.filter_by(user_id=current_user.id, game_id=game_id).first()
    if item and item.is_favorite:
        item.is_favorite = False
    elif item:
        item.list_type = "played"
        item.is_favorite = True
    else:
        db.session.add(UserGames(user_id=current_user.id, game_id=game_id, list_type="played", is_favorite=True))
    return _toggle_response(game_id)


# ── Reviews ───────────────────────────────────────────────────────────
@api.route("/games/<int:game_id>/reviews", methods=["POST"])
@login_required
def add_review(game_id: int):
    """Create a review (one per user per game, rating 1-5)."""
    record = get_create_game(game_id)
    data = request.get_json(silent=True) or {}
    try:
        rating = float(data.get("rating"))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid rating value"}), 400
    if not (1 <= rating <= 5):
        return jsonify({"error": "Rating must be between 1 and 5."}), 400
    comment = (data.get("comment") or "").strip()

    review = Review(user_id=current_user.id, game_id=record.igdb_id, comment=comment, rating=rating)
    db.session.add(review)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        # UniqueConstraint(user_id, game_id) — user already reviewed this game.
        return jsonify({"error": "You have already reviewed this game."}), 409
    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception("DB error saving review for game %s", game_id)
        return jsonify({"error": "Your review could not be saved. Please try again later."}), 500
    return jsonify(_review_dto(review)), 201


@api.route("/reviews/<int:review_id>", methods=["DELETE"])
@login_required
def delete_review(review_id: int):
    """Delete a review you own (replies cascade via the model relationship)."""
    review = Review.query.get_or_404(review_id)
    if review.user_id != current_user.id:
        return jsonify({"error": "You are not authorized to delete this review."}), 403
    try:
        db.session.delete(review)
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception("DB error deleting review %s", review_id)
        return jsonify({"error": "Something went wrong while deleting your review."}), 500
    return ("", 204)


# ── Discussion / replies ──────────────────────────────────────────────
@api.route("/discussion/<int:review_id>", methods=["GET"])
@login_required
def discussion(review_id: int):
    """The featured review plus its reply thread."""
    review = Review.query.get_or_404(review_id)
    replies = ReplyToReview.query.filter_by(review_id=review_id).all()
    return jsonify({
        "review": {
            "id": review.id,
            "gameId": review.game_id,
            "gameTitle": review.game.title if review.game else "Unknown",
            "username": review.user.username if review.user else "Unknown",
            "rating": review.rating,
            "comment": review.comment or "",
            "isOwn": review.user_id == current_user.id,
        },
        "replies": [
            {
                "id": rep.id,
                "username": rep.user.username if rep.user else "Unknown",
                "comment": rep.comment,
                "isOwn": rep.user_id == current_user.id,
            }
            for rep in replies
        ],
    })


@api.route("/reviews/<int:review_id>/replies", methods=["POST"])
@login_required
def add_reply(review_id: int):
    """Post a reply on a review's discussion thread."""
    Review.query.get_or_404(review_id)  # 404 if the parent review is gone
    data = request.get_json(silent=True) or {}
    comment = (data.get("comment") or "").strip()
    if not comment:
        return jsonify({"error": "Reply content missing"}), 400

    reply = ReplyToReview(review_id=review_id, user_id=current_user.id, comment=comment)
    db.session.add(reply)
    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception("DB error saving reply on review %s", review_id)
        return jsonify({"error": "Could not save your reply. Please try again later."}), 500
    return jsonify({
        "id": reply.id,
        "username": current_user.username,
        "comment": reply.comment,
        "isOwn": True,
    }), 201


@api.route("/replies/<int:reply_id>", methods=["DELETE"])
@login_required
def delete_reply(reply_id: int):
    """Delete a reply you own."""
    reply = ReplyToReview.query.get_or_404(reply_id)
    if reply.user_id != current_user.id:
        return jsonify({"error": "You are not authorized to delete this reply."}), 403
    try:
        db.session.delete(reply)
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        current_app.logger.exception("DB error deleting reply %s", reply_id)
        return jsonify({"error": "Something went wrong while deleting your reply."}), 500
    return ("", 204)


# ── Sales ─────────────────────────────────────────────────────────────
@api.route("/sales", methods=["GET"])
def sales():
    """Discounted popular games for the sales board.

    get_deals() returns popular games each with one-or-more discounted deals;
    the board shows one row per game, so we surface the deepest-cut deal of each.
    """
    out = []
    for i, g in enumerate(get_deals()):
        deals = g.get("deals") or []
        if not deals:
            continue
        best = max(deals, key=lambda d: d.get("cut", 0))
        out.append({
            "id": i,
            "title": g.get("title", "Unknown"),
            "store": best.get("shop", {}).get("name", "—"),
            "discount": best.get("cut", 0),
            "salePrice": best.get("price", {}).get("amount", 0),
            "url": best.get("url", ""),
        })
    return jsonify(out)


# ── AI chat (SSE passthrough) ─────────────────────────────────────────
@api.route("/chat", methods=["POST"])
@login_required
def chat():
    """Stream the LLM reply as Server-Sent Events.

    Reuses chatbot.generate_stream and the same prompt-injection guard as the
    HTML /chat route (strip client system messages, prepend our own).
    """
    incoming = (request.get_json(silent=True) or {}).get("messages", [])
    if not incoming or not isinstance(incoming, list):
        return jsonify({"error": "Payload validation failed"}), 400

    messages = [
        {"role": "system", "content": "You are a helpful web assistant focused on video games."}
    ] + [m for m in incoming if m.get("role") != "system"]

    resp = Response(generate_stream(messages), mimetype="text/event-stream")
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["X-Accel-Buffering"] = "no"
    return resp
