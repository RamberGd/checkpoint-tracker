import pytest
from unittest.mock import patch
from conftest import client, test_user, logged_in_client, mock_token, mock_igdb_post

def test_search_games_success(logged_in_client, mock_token, mock_igdb_post):
    """Confirms that a valid, logged-in search request works"""
    mock_response = mock_igdb_post.return_value
    mock_response.status_code = 200
    mock_response.json.return_value = [
        {
            "id": 123,
            "name": "Tom and Jerry: House Trap",
            "cover": {"url": "//://igdb.com"},
            "first_release_date": 972950400
        }
    ]

    response = logged_in_client.get('/games/search?q=tom')
    
    assert response.status_code == 200
    
    json_data = response.get_json()
    assert len(json_data) == 1
    assert json_data[0]['name'] == "Tom and Jerry: House Trap"
    assert json_data[0]['id'] == 123

    called_body_data = mock_igdb_post.call_args[1]['data']
    assert 'where name ~' in called_body_data or 'search' in called_body_data


def test_search_games_empty_query(logged_in_client):
    """Confirms that providing an empty string returns a clean empty collection"""
    response = logged_in_client.get('/games/search?q=')
    
    assert response.status_code == 200
    assert response.get_json() == []


def test_search_games_unauthorized(client):
    """Confirms that an unauthenticated client cannot query the backend endpoint"""
    response = client.get('/games/search?q=tom')
    
    assert response.status_code == 302
