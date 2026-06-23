"""Cache of IGDB API calls in the local database.

Games are fetched from IGDB on first access and stored in the DB so subsequent
requests do not hit the API.
"""
import datetime
from flask import abort
from sqlalchemy.exc import IntegrityError
from backend.igdb import fetch_game
from backend.models import Game
from backend.extensions import db


def get_create_game(igdb_id: int) -> Game:
    """Return a Game record, fetching from IGDB and caching in the DB if not present.

    Args:
        igdb_id: The IGDB integer ID of the game.

    Returns:
        The cached or newly created Game instance (see model).

    Raises:
        HTTPException 404: If IGDB returns no game for the given ID.
        HTTPException 503: If the IGDB API is unreachable.
    """
    game = Game.query.filter_by(igdb_id=igdb_id).first()
    if not game:
        try:
            data = fetch_game(igdb_id)
        except RuntimeError:
            abort(503)
        if data is None:
            abort(404)

        cover = data.get('cover')
        cover_url = ('https:' + cover['url'].replace('t_thumb', 't_cover_big')) if cover else None
        genres = ','.join(g['name'] for g in data.get('genres', []))
        game = Game(
            igdb_id=igdb_id,
            title=data['name'],
            summary=data.get('summary'),
            cover_url=cover_url,
            genres=genres,
            release_date=datetime.date.fromtimestamp(data['first_release_date']) if data.get('first_release_date') else None
        )
        db.session.add(game)
        try:
            db.session.commit()
        except IntegrityError:
            # A concurrent request cached this same game first — reuse its row
            # instead of failing on the igdb_id unique constraint. Without this,
            # two simultaneous requests for an uncached game (e.g. the game page
            # loading detail + prices in parallel) would race and one would 500.
            db.session.rollback()
            existing = Game.query.filter_by(igdb_id=igdb_id).first()
            if existing is None:
                raise
            game = existing
        except Exception:
            db.session.rollback()
            raise
    return game
