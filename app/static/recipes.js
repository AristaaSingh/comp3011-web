import {
  deleteRecipe as deleteRecipeRequest,
  fetchRecipeById,
  fetchRecipes
} from "./api.js";
import { escapeHtml } from "./utils.js";

function getRecipeFilters() {
  return {
    searchTerm: document.getElementById("searchInput").value.trim().toLowerCase(),
    tagFilter: document.getElementById("tagFilter").value.trim().toLowerCase(),
    maxMinutes: document.getElementById("minutesFilter").value
  };
}

function applyRecipeFilters(recipes) {
  const { searchTerm, tagFilter, maxMinutes } = getRecipeFilters();

  return recipes.filter((recipe) => {
    const matchesSearch = !searchTerm || recipe.name.toLowerCase().includes(searchTerm);
    const matchesTag =
      !tagFilter || (recipe.tags || []).some((tag) => tag.toLowerCase().includes(tagFilter));
    const matchesMinutes = !maxMinutes || recipe.minutes <= Number(maxMinutes);

    return matchesSearch && matchesTag && matchesMinutes;
  });
}

export async function loadRecipes() {
  const recipes = await fetchRecipes();
  renderRecipes(applyRecipeFilters(recipes));
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
            <button type="button" data-action="view-recipe" data-recipe-id="${recipe.id}">View</button>
            <button type="button" data-action="edit-recipe" data-recipe-id="${recipe.id}">Edit</button>
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
  document.getElementById("formOutput").textContent = `Recipe ${recipeId} deleted successfully.`;
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
  return loadRecipes();
}

export async function viewRecipe(recipeId) {
  const recipe = await fetchRecipeById(recipeId);
  document.getElementById("formOutput").textContent = JSON.stringify(recipe, null, 2);
}
