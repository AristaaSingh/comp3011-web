import {
  deleteRecipe as deleteRecipeRequest,
  fetchRecipeById,
  searchRecipes
} from "./api.js";
import { escapeHtml } from "./utils.js";

function getRecipeFilters() {
  return {
    query: document.getElementById("searchInput").value.trim(),
    tag: document.getElementById("tagFilter").value.trim(),
    maxMinutes: document.getElementById("minutesFilter").value
  };
}

export async function loadRecipes() {
  const recipes = await searchRecipes(getRecipeFilters());
  renderRecipes(recipes);
}

export function showRecipeEmptyState(message = "Search for recipes to see results here.") {
  const recipesGrid = document.getElementById("recipesGrid");
  if (!recipesGrid) {
    return;
  }

  if (!message) {
    recipesGrid.innerHTML = "";
    return;
  }

  recipesGrid.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
}

export function renderRecipes(recipes) {
  const recipesGrid = document.getElementById("recipesGrid");

  if (!recipes.length) {
    recipesGrid.innerHTML = `<div class="empty-state">No recipes match the current filters.</div>`;
    return;
  }

  recipesGrid.innerHTML = recipes
    .map((recipe) => {
      const tags = (recipe.tags || [])
        .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
        .join("");

      return `
        <article class="recipe-card">
          <h3>${escapeHtml(recipe.name)}</h3>
          <div class="recipe-meta">
            <div><strong>ID:</strong> ${recipe.id}</div>
            <div><strong>Minutes:</strong> ${recipe.minutes}</div>
            <div><strong>Ingredients:</strong> ${recipe.n_ingredients ?? (recipe.ingredients?.length || 0)}</div>
          </div>
          <p>${escapeHtml(recipe.description || "No description available.")}</p>
          <div class="recipe-tags">${tags}</div>
          <div class="recipe-actions">
            <a href="./recipe-detail.html?id=${recipe.id}" class="button-link">View</a>
            <a href="./recipe-form.html?recipeId=${recipe.id}" class="button-link">Edit</a>
            <button type="button" class="secondary" data-action="delete-recipe" data-recipe-id="${recipe.id}">Delete</button>
          </div>
        </article>
      `;
    })
    .join("");
}

export async function editRecipe(recipeId) {
  const recipe = await fetchRecipeById(recipeId);

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

export async function deleteRecipe(recipeId) {
  const confirmed = window.confirm(`Delete recipe ${recipeId}?`);
  if (!confirmed) {
    return;
  }

  await deleteRecipeRequest(recipeId);
  await loadRecipes();
}

export function resetForm() {
  document.getElementById("recipeId").value = "";
  document.getElementById("recipeForm").reset();
  document.getElementById("formTitle").textContent = "Add a Recipe";
  document.getElementById("submitButton").textContent = "Add Recipe";
}

export function resetFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("tagFilter").value = "";
  document.getElementById("minutesFilter").value = "";
}
