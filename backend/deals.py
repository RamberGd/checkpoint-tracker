import requests
from dotenv import load_dotenv
import os
import random

load_dotenv()

# retrieving the api key for ITAD
API_KEY = os.getenv("ITAD_API_KEY")
BASE_URL: str = "https://api.isthereanydeal.com"


def get_deals() -> list:
    """
    First, 50 of the most popular games are found on the basis of collection count,
    then their current deals and prices are gathered in dollars, from steam, gog or epic.
    Out of the 50 games, 10 games that have deals are randomly gathered and displayed.

    Returns:
        list: A list of up to 10 popular games with deal information.
              if the api call fails, then an empty list is returned instead.
    """
    try:
        #First the most the ids and titles of the most popular games in US (for better coverage) are collected.
        popular_url: str = f"{BASE_URL}/stats/most-collected/v1?key={API_KEY}&limit=50&country=US"
        popular_res = requests.get(popular_url)
        popular_res.raise_for_status()
        popular_games: list = popular_res.json()
        game_ids: list = [g["id"] for g in popular_games]

        #This creates a dictionary with the ids as the keys and titles as the values.
        title_map: dict = {g["id"]: g["title"] for g in popular_games}

        #Then the prices for these games, on steam, gog or epic, are found in Dollars.
        prices_url: str = f"{BASE_URL}/games/prices/v3?key={API_KEY}&country=US&shops=61,35,16"
        prices_res = requests.post(prices_url, json=game_ids)
        prices_res.raise_for_status()
        prices_data: list = prices_res.json()

        #The games with deals/sales are then filtered and their titles are added.
        #if a game's id is not found, then it has an unknown title. 
        result: list = []
        for game in prices_data:
            if game.get("deals"):
                discounted_deals = [d for d in game["deals"] if d["cut"] > 0]
                if discounted_deals:
                    game["title"] = title_map.get(game["id"], "Unknown")
                    game["deals"] = discounted_deals
                    result.append(game)

        random.shuffle(result)
        return result[:10]

    except requests.exceptions.RequestException as e:
        print(f"Error fetching deals: {e}")
        return []
    except KeyError as e:
        print(f"Unexpected response format: {e}")
        return []
    