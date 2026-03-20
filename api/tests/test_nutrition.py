def test_nutrition_search_returns_results(client, mock_usda):
    response = client.get("/nutrition/search", params={"query": "rice"})

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["fdc_id"] == 1002
    assert data[0]["description"] == "Rice, cooked"


def test_nutrition_search_returns_empty_list_when_no_match(client, mock_usda):
    response = client.get("/nutrition/search", params={"query": "mystery ingredient"})

    assert response.status_code == 200
    assert response.json() == []


def test_nutrition_estimate_scales_by_grams(client, mock_usda):
    response = client.post(
        "/nutrition/estimate",
        json={
            "ingredients": [
                {"name": "chicken breast", "grams": 150},
                {"name": "rice", "grams": 200},
            ]
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["ingredients"]) == 2
    assert round(data["totals"]["calories"], 1) == 507.5
    assert round(data["totals"]["protein"], 1) == 51.9
    assert round(data["totals"]["fat"], 1) == 6.0
    assert round(data["totals"]["carbs"], 1) == 56.0


def test_nutrition_estimate_handles_unmatched_ingredient(client, mock_usda):
    response = client.post(
        "/nutrition/estimate",
        json={"ingredients": [{"name": "mystery ingredient", "grams": 50}]},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["ingredients"][0]["ingredient"] == "mystery ingredient"
    assert data["ingredients"][0]["matched_food"] is None
    assert data["totals"]["calories"] == 0.0
