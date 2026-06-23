#using the function I made in the other file for pytest
from backend.comparison import search_game, get_prices

#this function checks if a title with multiple options is shown as a list
def test_returns_a_list():
    results = search_game("hollow knight")
    assert isinstance(results, list)


#this function checks so the dlcs of hollow knight are not returned as
#individual games, but only individual games that have the words hollow knight in them. 
def test_filters_out_dlc():
    results = search_game("hollow knight")
    for game in results:
        assert game["type"] == "game"


#this function checks if its possible to actually say something nonsensical, or perhaps very
#sensical, but doesn't exist, and if that returns a list.
def test_empty_search_returns_list():
    results = search_game("ThisCourseIsReallyHurtingMe")
    assert isinstance(results, list)


#this functions checks if the prices for hollow knight ,from its various stores, using its id are returning 
#as a list
def test_prices_returns_a_list():
    deals = get_prices("018d937f-1ae9-734c-ba47-bd357cf07edd")
    assert isinstance(deals, list)


#this bascially checks for hollow knight's id, that there are both shops and prices for every deal. 
def test_deals_have_shop_and_price():
    deals = get_prices("018d937f-1ae9-734c-ba47-bd357cf07edd")
    for deal in deals:
        assert "shop" in deal
        assert "price" in deal

#This is an integration test that checks the process of searching for a game and then getting its prices
def test_search_and_get_prices():
    #First a games is searched for
    results = search_game("hollow knight")
    assert len(results) > 0

    #The id of the first result is taken.
    game_id: str = results[0]["id"]

    #Its prices are retrieved.
    deals = get_prices(game_id)

    #Checking if the prices have the necessary structure. 
    assert isinstance(deals, list)
    for deal in deals:
        assert "shop" in deal
        assert "price" in deal