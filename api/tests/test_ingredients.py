def test_ingredient_search_returns_usda_results(client, mock_usda):
    response = client.get("/ingredients/search", params={"query": "chicken"})

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["fdc_id"] == 1001
    assert data[0]["description"] == "Chicken breast, cooked"
    assert data[0]["food_category"] == "Poultry Products"
