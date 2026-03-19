import {
  deleteRecipe as deleteRecipeRequest,
  fetchRecipeById,
  isAuthenticated,
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
  const canManageRecipes = isAuthenticated();

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
            ${canManageRecipes ? `<a href="./recipe-form.html?recipeId=${recipe.id}" class="button-link">Edit</a>` : ""}
            ${canManageRecipes ? `<button type="button" class="secondary" data-action="delete-recipe" data-recipe-id="${recipe.id}">Delete</button>` : ""}
          </div>
        </article>
      `;
    })
    .join("");
}

export async function editRecipe(recipeId) {
  const recipe = await fetchRecipeById(recipeId);
  let ingredientSuggestionId = 0;

  const splitIngredient = (value) => {
    const text = String(value || "").trim();
    const match = text.match(/^(\d+(?:[./]\d+)?(?:\s*[a-zA-Z]+)?(?:\s+\d+(?:[./]\d+)?)?)\s+(.+)$/);
    if (!match) {
      return { quantity: "", name: text };
    }

    return {
      quantity: match[1].trim(),
      name: match[2].trim()
    };
  };

  const setRepeatableValues = (listId, values, inputTag = "input") => {
    const list = document.getElementById(listId);
    if (!list) {
      return;
    }

    const items = (values && values.length ? values : inputTag === "chip" ? [] : [""]).map((value) => {
      if (inputTag === "chip") {
        return `
          <div class="tag-chip" data-value="${escapeHtml(value)}">
            <span>${escapeHtml(value)}</span>
            <button type="button" class="tag-chip-remove" data-remove-field="tag" aria-label="Remove tag">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 7h2v8h-2v-8zm4 0h2v8h-2v-8zM7 10h2v8H7v-8z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        `;
      }

      const fieldMarkup =
        inputTag === "textarea"
          ? `<textarea class="repeatable-input" rows="3" placeholder="Describe one cooking step">${escapeHtml(value)}</textarea>`
          : listId === "ingredientsList"
            ? (() => {
                const ingredient = splitIngredient(value);
                return `<div class="ingredient-item-fields">
                  <input class="repeatable-quantity-input" type="text" value="${escapeHtml(ingredient.quantity)}" placeholder="e.g. 2 tbsp" />
                  <div class="repeatable-field-shell">
                    <input class="repeatable-input" type="text" value="${escapeHtml(ingredient.name)}" data-suggestions-id="ingredient-suggestions-edit-${ingredientSuggestionId}" />
                    <div id="ingredient-suggestions-edit-${ingredientSuggestionId++}" class="ingredient-suggestions hidden" role="listbox"></div>
                  </div>
                </div>`;
              })()
            : `<input class="repeatable-input" type="text" value="${escapeHtml(value)}" />`;

      return `
        <div class="repeatable-item">
          ${fieldMarkup}
          <button type="button" class="secondary remove-field-button" data-remove-field="${escapeHtml(
            listId === "tagsList" ? "tag" : listId === "ingredientsList" ? "ingredient" : "step"
          )}">Remove</button>
        </div>
      `;
    });

    list.innerHTML = items.join("");
  };

  document.getElementById("recipeId").value = recipe.id;
  document.getElementById("name").value = recipe.name || "";
  document.getElementById("description").value = recipe.description || "";
  document.getElementById("minutes").value = recipe.minutes || "";
  setRepeatableValues("ingredientsList", recipe.ingredients || [], "input");
  setRepeatableValues("stepsList", recipe.steps || [], "textarea");
  setRepeatableValues("tagsList", recipe.tags || [], "chip");

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
  document.getElementById("tagsList").innerHTML = "";
  document.getElementById("ingredientsList").innerHTML = "";
  document.getElementById("stepsList").innerHTML = "";
  document.getElementById("tagInputField").value = "";
  let ingredientSuggestionId = 0;
  for (const listId of ["ingredientsList", "stepsList"]) {
    const list = document.getElementById(listId);
    if (!list) {
      continue;
    }

    const fieldType =
      listId === "tagsList" ? "tag" : listId === "ingredientsList" ? "ingredient" : "step";
    const field = fieldType === "step" ? document.createElement("textarea") : document.createElement("input");
    const item = document.createElement("div");
    const removeButton = document.createElement("button");

    item.className = "repeatable-item";
    field.className = fieldType === "ingredient" ? "repeatable-input" : "repeatable-input";
    if (fieldType === "step") {
      field.rows = 3;
      field.placeholder = "Describe one cooking step";
    } else {
      field.type = "text";
      field.placeholder = fieldType === "tag" ? "e.g. quick dinner" : "Ingredient name";
    }
    removeButton.type = "button";
    removeButton.className = "secondary remove-field-button";
    removeButton.dataset.removeField = fieldType;
    removeButton.textContent = "Remove";

    if (fieldType === "ingredient") {
      const quantity = document.createElement("input");
      const wrapper = document.createElement("div");
      const suggestions = document.createElement("div");
      const datalistId = `ingredient-suggestions-reset-${ingredientSuggestionId++}`;
      const content = document.createElement("div");

      quantity.type = "text";
      quantity.className = "repeatable-quantity-input";
      quantity.placeholder = "e.g. 2 tbsp";
      content.className = "ingredient-item-fields";
      wrapper.className = "repeatable-field-shell";
      suggestions.id = datalistId;
      suggestions.className = "ingredient-suggestions hidden";
      suggestions.setAttribute("role", "listbox");
      field.dataset.suggestionsId = datalistId;

      wrapper.append(field, suggestions);
      content.append(quantity, wrapper);
      item.append(content, removeButton);
    } else {
      item.append(field, removeButton);
    }

    list.append(item);
  }
  document.getElementById("formTitle").textContent = "Add a Recipe";
  document.getElementById("submitButton").textContent = "Add Recipe";
}

export function resetFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("tagFilter").value = "";
  document.getElementById("minutesFilter").value = "";
}
