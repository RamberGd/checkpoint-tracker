import unittest.mock
import requests
import pytest
from backend.igdb import fetch_game, search_games


def test_successful_fetch_returns(mock_token):
    """A valid IGDB response is acquired and the first game dict is returned"""
    mock_response = unittest.mock.Mock()
    mock_response.json.return_value = [{'id': 1, 'name': 'Hades', 'genres': []}]

    with unittest.mock.patch('backend.igdb.requests.post', return_value=mock_response):
        result = fetch_game(1)
        assert result['id'] == 1
        assert result['name'] == 'Hades'
        assert result['genres'] == []


def test_failed_fetch_returns(mock_token):
    """An empty IGDB response (game not found) makes fetch_game return None"""
    mock_response = unittest.mock.Mock()
    mock_response.json.return_value = []
    with unittest.mock.patch('backend.igdb.requests.post', return_value=mock_response):
        result = fetch_game(1)
        assert result is None


def test_http_error(mock_token):
    """A network failure causes fetch_game to raise RuntimeError"""
    mock_response = unittest.mock.Mock()
    mock_response.raise_for_status.side_effect = requests.exceptions.RequestException("Bad Request")

    with unittest.mock.patch('backend.igdb.requests.post', return_value=mock_response):
        with pytest.raises(RuntimeError):
            fetch_game(1)


# Integration test with real API call
def test_integration_fetch_game():
    """fetch_game returns the correct game data for a known IGDB ID"""
    result = fetch_game(1942)
    assert result['id'] == 1942
    assert result['name'] is not None
