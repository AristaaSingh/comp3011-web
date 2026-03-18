import { createRecipe, updateRecipe } from "./api.js";
import {
  deleteRecipe,
  editRecipe,
  loadRecipes,
  resetFilters,
  resetForm,
  viewRecipe
} from "./recipes.js";
import {
  handleNutritionEstimate,
  handleNutritionSearch,
  renderNutritionEstimateResults
} from "./nutrition.js";
import {
  parseCommaSeparated,
  parseOptionalNumber
} from "./utils.js";

function buildRecipePayload() {
  return {
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
}

function showError(targetId, error) {
  const target = document.getElementById(targetId);
  target.textContent = error instanceof Error ? error.message : String(error);
}

async function handleRecipeSubmit(event) {
  event.preventDefault();

  const recipeId = document.getElementById("recipeId").value;
  const payload = buildRecipePayload();

  try {
    const data = recipeId
      ? await updateRecipe(recipeId, payload)
      : await createRecipe(payload);

    document.getElementById("formOutput").textContent = JSON.stringify(data, null, 2);
    resetForm();
    await loadRecipes();
  } catch (error) {
    showError("formOutput", error);
  }
}

async function handleRecipesGridClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  const recipeId = Number(button.dataset.recipeId);

  try {
    if (button.dataset.action === "view-recipe") {
      await viewRecipe(recipeId);
      return;
    }

    if (button.dataset.action === "edit-recipe") {
      await editRecipe(recipeId);
      return;
    }

    if (button.dataset.action === "delete-recipe") {
      await deleteRecipe(recipeId);
    }
  } catch (error) {
    showError("formOutput", error);
  }
}

function initializeRecipeSection() {
  document.getElementById("recipeForm").addEventListener("submit", handleRecipeSubmit);
  document.getElementById("searchRecipesButton").addEventListener("click", () => {
    loadRecipes().catch((error) => showError("formOutput", error));
  });
  document.getElementById("resetFiltersButton").addEventListener("click", () => {
    resetFilters().catch((error) => showError("formOutput", error));
  });
  document.getElementById("clearFormButton").addEventListener("click", resetForm);
  document.getElementById("cancelEditButton").addEventListener("click", resetForm);
  document.getElementById("refreshRecipesButton").addEventListener("click", () => {
    loadRecipes().catch((error) => showError("formOutput", error));
  });
  document.getElementById("recipesGrid").addEventListener("click", handleRecipesGridClick);
}

function initializeNutritionSection() {
  document.getElementById("nutritionSearchButton").addEventListener("click", async () => {
    try {
      await handleNutritionSearch();
    } catch (error) {
      showError("nutritionSearchResults", error);
    }
  });

  document.getElementById("nutritionEstimateButton").addEventListener("click", async () => {
    try {
      await handleNutritionEstimate();
    } catch (error) {
      showError("nutritionEstimateResults", error);
    }
  });

  renderNutritionEstimateResults(null);
}

function initializeApp() {
  initializeRecipeSection();
  initializeNutritionSection();
  loadRecipes().catch((error) => showError("formOutput", error));
}

initializeApp();
