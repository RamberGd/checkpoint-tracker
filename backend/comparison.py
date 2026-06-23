# importing and creating necessary libraries and variables.
import requests
from dotenv import load_dotenv
import os

load_dotenv()

API_KEY = os.getenv("ITAD_API_KEY")
BASE_URL: str = "https://api.isthereanydeal.com"


def search_game(title: str) -> list:
    """
    The title of a game is used to search on "Is There Any Deal" api.
    The returned results are actual games, the dlcs are filtered out.

    Args:
        title (str): The name of the game that is being searched.

    Returns:
        list: This list contains any games that matching titles.
    """
    try:
        url: str = f"{BASE_URL}/games/search/v1?key={API_KEY}&title={title}"
        response = requests.get(url)
        response.raise_for_status()
        data: list = response.json()

        # this makes sure only the games are returned without DLCs.
        games: list = []
        for g in data:
            if g["type"] == "game":
                games.append(g)
        return games

    except requests.exceptions.RequestException as e:
        print(f"Error searching for game: {e}")
        return []


def get_prices(game_id: str) -> list:
    """
    The prices of a game are displayed for Steam, GOG and Epic through the use of
    its ITAD game ID. The prices are shown in USD to increase coverage. data[0] is necessary, 
    because even if there is only game, the information is returned as a list.

    Args:
        game_id (str): The ITAD game ID to fetch prices for.

    Returns:
        list: The list of deals from different stores, this will be empty is the API call fails.
    """
    try:
        # shop ids: 61 = Steam, 35 = GOG, 16 = Epic
        url: str = f"{BASE_URL}/games/prices/v3?key={API_KEY}&country=US&shops=61,35,16"
        response = requests.post(url, json=[game_id])
        response.raise_for_status()
        data: list = response.json()

        if not data or not data[0].get("deals"):
            return []
        return data[0]["deals"]

    except requests.exceptions.RequestException as e:
        print(f"Error fetching prices: {e}")
        return []


#this is the interaction part of the code which allows the user to look for a game 
#and select the title by number. The selected games prices across steam, gog and epic 
#are shown. 

if __name__ == "__main__":
    title: str = input("Search for a game: ")
    results: list = search_game(title)

    for i, game in enumerate(results):
        print(f"{i + 1}. {game['title']}")

    choice: int = int(input("Pick a game (enter the number): ")) - 1
    selected: dict = results[choice]

    print(f"\nPrices for {selected['title']}:")
    deals: list = get_prices(selected["id"])

    if not deals:
        print("No deals found for this game on Steam, GOG or Epic.")
    else:
        for deal in deals:
            print(f"{deal['shop']['name']}: ${deal['price']['amount']}")