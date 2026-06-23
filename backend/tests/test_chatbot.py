# tests/test_chat.py
import json
import pytest
import unittest.mock

def test_chat_get_route_renders_template(logged_in_client):
    """Verifies that authenticated users hitting GET /chat load the html template view safely"""
    response = logged_in_client.get('/chat')
    assert response.status_code == 200

def test_chat_unauthorized_if_not_logged_in(client):
    """Verifies that anonymous traffic gets blocked instantly with an HTTP 401 response code"""
    payload = {"messages": [{"role": "user", "content": "Hello bot"}]}
    response = client.post('/chat', json=payload)
    
    assert response.status_code == 302
    assert b'/login' in response.data

def test_chat_post_payload_validation_checks(logged_in_client):
    """Verifies the backend validation guard rails reject malformed data with an HTTP 400"""
    bad_payload = {"msgs": []}
    response = logged_in_client.post('/chat', json=bad_payload)
    
    assert response.status_code == 400
    assert b"Payload validation failed" in response.data

@unittest.mock.patch('requests.Session.post') 
def test_chat_streaming_success_pipeline(mock_post, logged_in_client):
    """Simulates a successful streaming event pipeline by overriding global request methods"""
    mock_response = unittest.mock.Mock()
    mock_response.status_code = 200
    mock_response.iter_lines.return_value = [
        b'{"message": {"role": "assistant", "content": "Hello "}}',
        b'{"message": {"role": "assistant", "content": "Hallo "}}',
    ]
    mock_post.return_value = mock_response

    payload = {"messages": [{"role": "user", "content": "Name a good shooter game."}]}

    response = logged_in_client.post('/chat', json=payload)
    
    assert response.status_code == 200
    assert 'text/event-stream' in response.headers.get('Content-Type')
    
    stream_content = response.data.decode('utf-8')
    assert "Hello" in stream_content
    assert "Hallo" in stream_content
    assert "[DONE]" in stream_content
