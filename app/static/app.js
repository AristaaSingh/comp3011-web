const API_BASE = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", () => {
  loadRecipes();

  document.getElementById("recipeForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const recipeId = document.getElementById("recipeId").value;

    const payload = {
      name: document.getElementById("name").value.trim(),
      description: document.getElementById("description").value.trim() || null,
      minutes: Number(document.getElementById("minutes").value),
      ingredients: parseCommaSeparated("ingredients"),
      steps: parseCommaSeparated("steps"),
      tags: parseCommaSeparated("tags"),
      calories: parseOptionalNumber("calories"),
      protein: parseOptionalNumber("protein"),
      fat: parseOptionalNumber("fat"),
      carbs: parseOptionalNumber("carbs")
    };

    let res;
    if (recipeId) {
      res = await fetch(`${API_BASE}/recipes/${recipeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${API_BASE}/recipes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();
    document.getElementById("formOutput").textContent = JSON.stringify(data, null, 2);

    if (res.ok) {
      resetForm();
      loadRecipes();
    }
  });
});

function parseCommaSeparated(id) {
  return document
    .getElementById(id)
    .value
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
}

function parseOptionalNumber(id) {
  const value = document.getElementById(id).value;
  return value === "" ? null : parseFloat(value);
}

async function loadRecipes() {
  const res = await fetch(`${API_BASE}/recipes`);
  const data = await res.json();

  const recipesGrid = document.getElementById("recipesGrid");
  recipesGrid.innerHTML = "";

  if (!data.length) {
    recipesGrid.innerHTML = `<div class="empty-state">No recipes found.</div>`;
    return;
  }

  // UI-only filtering for now
  const searchTerm = document.getElementById("searchInput").value.trim().toLowerCase();
  const tagFilter = document.getElementById("tagFilter").value.trim().toLowerCase();
  const maxMinutes = document.getElementById("minutesFilter").value;

  let filtered = data.filter(recipe => {
    const matchesSearch = !searchTerm || recipe.name.toLowerCase().includes(searchTerm);
    const matchesTag =
      !tagFilter || (recipe.tags || []).some(tag => tag.toLowerCase().includes(tagFilter));
    const matchesMinutes =
      !maxMinutes || recipe.minutes <= Number(maxMinutes);

    return matchesSearch && matchesTag && matchesMinutes;
  });

  if (!filtered.length) {
    recipesGrid.innerHTML = `<div class="empty-state">No recipes match the current filters.</div>`;
    return;
  }

  filtered.forEach(recipe => {
    const card = document.createElement("div");
    card.className = "recipe-card";

    card.innerHTML = `
      <h3>${escapeHtml(recipe.name)}</h3>
      <div class="recipe-meta">
        <div><strong>ID:</strong> ${recipe.id}</div>
        <div><strong>Minutes:</strong> ${recipe.minutes}</div>
        <div><strong>Ingredients:</strong> ${recipe.n_ingredients ?? (recipe.ingredients?.length || 0)}</div>
      </div>
      <p>${escapeHtml(recipe.description || "No description available.")}</p>

      <div class="recipe-tags">
        ${(recipe.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>

      <div class="recipe-actions">
        <button onclick="viewRecipe(${recipe.id})">View</button>
        <button onclick="editRecipe(${recipe.id})">Edit</button>
        <button class="secondary" onclick="deleteRecipe(${recipe.id})">Delete</button>
      </div>
    `;

    recipesGrid.appendChild(card);
  });
}

async function viewRecipe(recipeId) {
  const res = await fetch(`${API_BASE}/recipes/${recipeId}`);
  const data = await res.json();
  document.getElementById("formOutput").textContent = JSON.stringify(data, null, 2);
}

async function editRecipe(recipeId) {
  const res = await fetch(`${API_BASE}/recipes/${recipeId}`);
  const recipe = await res.json();

  document.getElementById("recipeId").value = recipe.id;
  document.getElementById("name").value = recipe.name || "";
  document.getElementById("description").value = recipe.description || "";
  document.getElementById("minutes").value = recipe.minutes || "";
  document.getElementById("ingredients").value = (recipe.ingredients || []).join(", ");
  document.getElementById("steps").value = (recipe.steps || []).join(", ");
  document.getElementById("tags").value = (recipe.tags || []).join(", ");
  document.getElementById("calories").value = recipe.calories ?? "";
  document.getElementById("protein").value = recipe.protein ?? "";
  document.getElementById("fat").value = recipe.fat ?? "";
  document.getElementById("carbs").value = recipe.carbs ?? "";

  document.getElementById("formTitle").textContent = `Update Recipe #${recipe.id}`;
  document.getElementById("submitButton").textContent = "Update Recipe";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteRecipe(recipeId) {
  const confirmed = confirm(`Delete recipe ${recipeId}?`);
  if (!confirmed) return;

  const res = await fetch(`${API_BASE}/recipes/${recipeId}`, {
    method: "DELETE"
  });

  if (res.status === 204) {
    loadRecipes();
    const output = document.getElementById("formOutput");
    output.textContent = `Recipe ${recipeId} deleted successfully.`;
  } else {
    const data = await res.json();
    document.getElementById("formOutput").textContent = JSON.stringify(data, null, 2);
  }
}

function resetFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("tagFilter").value = "";
  document.getElementById("minutesFilter").value = "";
  loadRecipes();
}

function resetForm() {
  document.getElementById("recipeId").value = "";
  document.getElementById("recipeForm").reset();
  document.getElementById("formTitle").textContent = "Add a Recipe";
  document.getElementById("submitButton").textContent = "Add Recipe";
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}