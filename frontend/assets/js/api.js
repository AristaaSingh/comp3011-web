const API_BASE = window.API_BASE || "http://127.0.0.1:8000";

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const detail =
      typeof payload === "string"
        ? payload
        : payload?.detail || "Request failed";
    throw new Error(detail);
  }

  return payload;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options);
  return parseResponse(response);
}

export function fetchRecipes() {
  return request("/recipes");
}

export function searchRecipes(filters = {}) {
  const params = new URLSearchParams();

  if (filters.query) {
    params.set("query", filters.query);
  }

  if (filters.tag) {
    params.set("tag", filters.tag);
  }

  if (filters.maxMinutes) {
    params.set("max_minutes", filters.maxMinutes);
  }

  const query = params.toString();
  return request(query ? `/recipes/search?${query}` : "/recipes/search");
}

export function fetchRecipeById(recipeId) {
  return request(`/recipes/${recipeId}`);
}

export function createRecipe(payload) {
  return request("/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function updateRecipe(recipeId, payload) {
  return request(`/recipes/${recipeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function deleteRecipe(recipeId) {
  return request(`/recipes/${recipeId}`, {
    method: "DELETE"
  });
}

export function searchNutritionFoods(query) {
  const params = new URLSearchParams({ query });
  return request(`/nutrition/search?${params.toString()}`);
}

export function estimateNutrition(ingredients) {
  return request("/nutrition/estimate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredients })
  });
}
