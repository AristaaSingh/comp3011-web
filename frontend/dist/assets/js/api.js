const API_BASE = window.API_BASE || "http://127.0.0.1:8000";
const AUTH_STORAGE_KEY = "recipe_auth";

function normalizeErrorDetail(detail) {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object") {
          const location = Array.isArray(item.loc) ? item.loc.slice(1).join(" > ") : "";
          const message = item.msg || "Invalid input";
          return location ? `${location}: ${message}` : message;
        }

        return "Invalid input";
      })
      .join(". ");
  }

  if (detail && typeof detail === "object") {
    return detail.msg || detail.message || "Request failed";
  }

  return "Request failed";
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const detail = typeof payload === "string"
      ? payload
      : normalizeErrorDetail(payload?.detail);
    throw new Error(detail);
  }

  return payload;
}

function getStoredAuthPayload() {
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function getAuthHeaders(headers = {}) {
  const auth = getStoredAuthPayload();
  if (!auth?.accessToken) {
    return headers;
  }

  return {
    ...headers,
    Authorization: `Bearer ${auth.accessToken}`
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: getAuthHeaders(options.headers || {})
  });

  try {
    return await parseResponse(response);
  } catch (error) {
    if (response.status === 401) {
      clearAuthState();
    }
    throw error;
  }
}

export function fetchRecipes() {
  return request("/recipes");
}

export function fetchMyRecipes() {
  return request("/recipes/mine");
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

export function searchIngredientOptions(query) {
  const params = new URLSearchParams({ query });
  return request(`/ingredients/search?${params.toString()}`);
}

export function estimateNutrition(ingredients) {
  return request("/nutrition/estimate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredients })
  });
}

export function storeAuthSession(payload) {
  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      accessToken: payload.access_token,
      user: payload.user
    })
  );
}

export function clearAuthState() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getAuthSession() {
  return getStoredAuthPayload();
}

export function isAuthenticated() {
  return Boolean(getStoredAuthPayload()?.accessToken);
}

export function registerUser(payload) {
  return request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function loginUser(payload) {
  return request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function fetchCurrentUser() {
  return request("/users/me");
}

export function updateCurrentUser(payload) {
  return request("/users/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function changeCurrentUserPassword(payload) {
  return request("/users/me/password", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function deleteCurrentUserAccount(payload) {
  return request("/users/me", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
