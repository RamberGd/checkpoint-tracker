"""Client for the IGDB API via Twitch OAuth."""
import requests
import os
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

CLIENT_ID: Optional[str] = os.environ.get('IGDB_CLIENT_ID')
CLIENT_SECRET: Optional[str] = os.environ.get('IGDB_CLIENT_SECRET')
TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
IGDB_URL = 'https://api.igdb.com/v4'

# In-memory token cache — persists for the lifetime of the process.
token_cache: dict[str, Optional[str]] = {'token': None}


def get_token(client_id: Optional[str], client_secret: Optional[str]) -> str:
    """Fetch and cache a Twitch OAuth token for IGDB access.

    Args:
        client_id: Twitch application client ID.
         client_secret: Twitch application client secret.

    Returns:
        A valid OAuth access token string.

    Raises:
        RuntimeError: If credentials are missing.
        requests.exceptions.HTTPError: If Twitch rejects the credentials.
    """
    if not client_id or not client_secret:
        raise RuntimeError("IGDB credentials not configured: IGDB_CLIENT_ID and IGDB_CLIENT_SECRET must be set.")

    if token_cache['token']:
        return token_cache['token']  # Only cache in memory, add expiration handling later (?)

    response = requests.post(TOKEN_URL, params={
        'client_id': client_id,
        'client_secret': client_secret,
        'grant_type': 'client_credentials'
    })
    response.raise_for_status()
    token_cache['token'] = response.json()['access_token']
    return token_cache['token']


def fetch_game(igdb_id: int) -> Optional[dict]:
    """Fetch a single game's data from IGDB by its ID.

    Args:
        igdb_id: The IGDB integer ID of the game.

    Returns:
        A dict of game fields, or None if no game was found for that ID.

    Raises:
        RuntimeError: If the IGDB API is unreachable or returns a network error.
    """
    try:
        token = get_token(CLIENT_ID, CLIENT_SECRET)
        headers = {
            'Client-ID': CLIENT_ID,
            'Authorization': f'Bearer {token}'
        }
        response = requests.post(
            f'{IGDB_URL}/games',
            headers=headers,
            data=f'fields name,summary,cover.url,genres.name,first_release_date; where id = {igdb_id}; limit 1;'
        )
        response.raise_for_status()
        game_data = response.json()
        if not game_data:
            return None
        return game_data[0]
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"IGDB unavailable: {e}") from e



def search_games(query: str, limit: int = 30, offset: int = 0) -> list[dict[str, any]]:
    """Searches the IGDB database for video games matching a query string.

    This function fetches a temporary bearer token, formats a raw text query
    using the IGDB Query Language (Apicalypse), and requests specific fields
    for up to 5 matching games.

    Args:
        query: The search term or game title entered by the user.

    Returns:
        A list of dictionaries containing game data (name, summary, cover URL, 
        genres, and release date). Returns an empty list if the request fails.
    """
    # escaping double quotes to prevent syntax breaks
    clean_query = query.replace('"', '\\"')
    
    # getting the necessary access token for authentication
    token = get_token(CLIENT_ID, CLIENT_SECRET)
    
    headers = {
        'Client-ID': CLIENT_ID,
        'Authorization': f'Bearer {token}'
    }
    
    # constructing the query string required by the IGDB API body
    body_data = (
        f'search "{clean_query}"; '
        f'fields name,summary,cover.url,genres.name,first_release_date; '
        f'limit {limit}; offset {offset};'
    )
    
    try:
        response = requests.post(
            f'{IGDB_URL}/games', 
            headers=headers, 
            data=body_data,
            timeout=10
        )
        # trigger an exception block if the server returns an error code
        response.raise_for_status()
        
        # cast the JSON payload to match the declared return type hint
        game_results = response.json()
        return game_results
    
    except Exception as general_err:
        print(f"Unexpected error processing game search: {general_err}")
        return []
