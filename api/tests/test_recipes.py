def sample_recipe_payload():
    return {
        "name": "Chicken Rice Bowl",
        "description": "Simple lunch",
        "minutes": 20,
        "ingredients": [
            "150 g chicken breast",
            "200 g rice",
            "50 g broccoli",
        ],
        "steps": [
            "Cook the chicken.",
            "Cook the rice.",
            "Serve with broccoli.",
        ],
        "tags": ["quick", "meal-prep"],
    }


def test_get_recipes_returns_empty_list(client):
    response = client.get("/recipes")
    assert response.status_code == 200
    assert response.json() == []


def test_create_recipe_requires_authentication(client, mock_usda):
    response = client.post("/recipes", json=sample_recipe_payload())

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication required"


def test_create_recipe_sets_owner_and_calculates_nutrition(client, auth_headers, mock_usda):
    response = client.post("/recipes", headers=auth_headers, json=sample_recipe_payload())

    assert response.status_code == 201
    data = response.json()
    assert data["owner_id"] == 1
    assert data["n_ingredients"] == 3
    assert round(data["calories"], 1) == 525.0
    assert round(data["protein"], 1) == 53.1
    assert round(data["fat"], 1) == 6.2
    assert round(data["carbs"], 1) == 59.6


def test_get_recipe_by_id_returns_recipe(client, auth_headers, mock_usda):
    create_response = client.post("/recipes", headers=auth_headers, json=sample_recipe_payload())
    recipe_id = create_response.json()["id"]

    response = client.get(f"/recipes/{recipe_id}")

    assert response.status_code == 200
    assert response.json()["name"] == "Chicken Rice Bowl"


def test_search_recipes_filters_by_query_tag_and_minutes(client, auth_headers, mock_usda):
    client.post("/recipes", headers=auth_headers, json=sample_recipe_payload())

    response = client.get(
        "/recipes/search",
        params={"query": "Chicken", "tag": "meal-prep", "max_minutes": 25},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Chicken Rice Bowl"


def test_update_recipe_only_allowed_for_owner(client, auth_headers, second_user_headers, mock_usda):
    create_response = client.post("/recipes", headers=auth_headers, json=sample_recipe_payload())
    recipe_id = create_response.json()["id"]

    response = client.put(
        f"/recipes/{recipe_id}",
        headers=second_user_headers,
        json={"minutes": 30},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "You can only edit recipes you created"


def test_update_recipe_recalculates_nutrition(client, auth_headers, mock_usda):
    create_response = client.post("/recipes", headers=auth_headers, json=sample_recipe_payload())
    recipe_id = create_response.json()["id"]

    response = client.put(
        f"/recipes/{recipe_id}",
        headers=auth_headers,
        json={"ingredients": ["300 g chicken breast"], "steps": ["Cook it."]},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["n_ingredients"] == 1
    assert round(data["calories"], 1) == 495.0
    assert round(data["protein"], 1) == 93.0
    assert round(data["fat"], 1) == 10.8
    assert round(data["carbs"], 1) == 0.0


def test_delete_recipe_only_allowed_for_owner(client, auth_headers, second_user_headers, mock_usda):
    create_response = client.post("/recipes", headers=auth_headers, json=sample_recipe_payload())
    recipe_id = create_response.json()["id"]

    response = client.delete(f"/recipes/{recipe_id}", headers=second_user_headers)

    assert response.status_code == 403
    assert response.json()["detail"] == "You can only delete recipes you created"


def test_delete_recipe_removes_recipe(client, auth_headers, mock_usda):
    create_response = client.post("/recipes", headers=auth_headers, json=sample_recipe_payload())
    recipe_id = create_response.json()["id"]

    delete_response = client.delete(f"/recipes/{recipe_id}", headers=auth_headers)
    get_response = client.get(f"/recipes/{recipe_id}")

    assert delete_response.status_code == 204
    assert get_response.status_code == 404
