from backend.deals import get_deals

#this function checks if the deals are returned as a list. 
def test_returns_a_list():
    deals = get_deals()
    assert isinstance(deals, list)


#this function checks if the list specifically contains 5 deals.
def test_returns_five_deals():
    deals = get_deals()
    assert len(deals) == 5


#this function checks if the deals have a title.
def test_deals_have_title():
    deals = get_deals()
    for deal in deals:
        assert "title" in deal


#this function checks if the deals have a price.
def test_deals_have_price():
    games = get_deals()
    for game in games:
        for deal in game["deals"]:
            assert "price" in deal
