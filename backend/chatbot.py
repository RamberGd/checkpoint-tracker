from flask import jsonify
import os
import json
import requests


# reusable session (from my research, it should improve network efficiency)
http_session = requests.Session()

def search_web(query: str):
    """Getting real-time web context using exa API
    
    Args:
        query: The search query string provided by the user

    Returns:
        A formatted string containing titles and summary highlights from the 
        top 10 search results, or an error message string if the search fails
    """
    api_key = os.environ.get('SEARCH_API_KEY')
    if not api_key:
        return "Search API key missing. Cannot fetch live data."
        
    # setting up necessities for an api call
    url = "https://api.exa.ai/search"
    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json"
    }
    payload = {
        "query": query,
        "numResults": 10,
        "type": "auto",
        "contents": {
            "highlights": True
        }
    }
    
    try:
        res = http_session.post(url, json=payload, headers=headers, timeout=5)
        
        if res.status_code == 200:
            results = res.json().get("results", [])    
            snippets = []

            for r in results:
                title = r.get("title", "No Title")

                # extracting the primary highlight if it exists
                highlights_list = r.get("highlights", [])
                info = highlights_list[0] if highlights_list else "No highlight summary available."
                
                snippets.append(f"Title: {title}\nInfo: {info}")
                
            return "\n\n".join(snippets)
            
    except Exception:
        # silent fail
        pass
    
    # returning a fallback string so the main app doesn't crash
    return "Could not retrieve live search data."

# function to stream text chunks to the client
def generate_stream(session_messages):
    """Streams Server-Sent Events (SSE) text chunks from Ollama to the client.

    This function enriches the conversation history with real-time web search
    context before initiating a streaming request to the Ollama API.

    Args:
        session_messages: A list of chat message dictionaries, where each 
            dictionary represents a message role (e.g., 'user', 'assistant') 
            and its text content.

    Yields:
        A formatted SSE data string (`data: {...}\n\n`) containing either 
        token content, error messages, or the `[DONE]` signal.

    Returns:
        A Flask JSON response with a 500 status code *only* if the API key configuration 
        fails before the stream starts. Returns None upon successful stream completion.
    """
    api_key = os.environ.get('OLLAMA_API_KEY')
    # ERROR HANDLING: making sure the api key is ok
    if not api_key:
        return jsonify({"error": "Configuration Error: Server OLLAMA_API_KEY environment variable is not set."}), 500

    # getting web results for the latest user query
    latest_user_query = session_messages[-1]["content"] if session_messages else ""
    live_context = search_web(latest_user_query)

    # enriching the messages with the context from the web results
    enriched_messages = session_messages.copy()
    enriched_messages.insert(-1, {
        "role": "system",
        "content": f"You are a helpful gaming assistant. Use your available data the following real-time web search results to answer the user's question accurately. Do not mention the search results explicitly unless necessary.\n\n--- SEARCH RESULTS ---\n{live_context}"
    })

    # setting up necessities for an api call
    url = "https://ollama.com/api/chat"
    headers = {
        'Authorization': f'Bearer {api_key}',
        "Content-Type": "application/json"
    }
    payload = {
        "model": "gpt-oss:120b",
        "messages": enriched_messages,
        "stream": True
    }

    try:
        # making the api call
        response = http_session.post(url, json=payload, headers=headers, stream=True, timeout=15)
        
        # ERROR HANDLING: handling response errors
        if response.status_code != 200:
            yield f"data: {json.dumps({'error': f'Ollama Cloud Engine Rejected Request: Status {response.status_code}'})}\n\n"
            return

        # processing response
        for line in response.iter_lines():
            if not line:
                continue # ignoring empty packets
                
            try:
                chunk_data = json.loads(line.decode('utf-8')) # making the response readable (standard UTF-8 text string)
                
                content = chunk_data.get("message", {}).get("content", "") # getting the wanted (token) text from the chunk_data 
                if content:
                    yield f"data: {json.dumps({'content': content})}\n\n" # final version of response goes to frontend
            except json.JSONDecodeError:
                continue # just ignoring unparseable packets without freezing
            
        # signaling to the frontend that streaming has ended successfully
        yield "data: [DONE]\n\n"
        
    # ERROR HANDLING: handle network drops and etc.
    except requests.exceptions.Timeout:
        yield f"data: {json.dumps({'error': 'Gateway Timeout: The cloud server took too long to reply.'})}\n\n"
    except requests.exceptions.RequestException as network_err:
        yield f"data: {json.dumps({'error': f'Network Connection Error: {str(network_err)}'})}\n\n"
    except Exception as general_err:
        yield f"data: {json.dumps({'error': f'Unexpected Error: {str(general_err)}'})}\n\n"
