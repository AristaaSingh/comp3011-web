import { estimateNutrition, searchIngredientOptions } from "./api.js";
import { escapeHtml } from "./utils.js";

let selectedIngredients = [];
let searchTimerId = null;

function formatNumber(value) {
  if (value == null) {
    return "N/A";
  }

  return Number(value).toFixed(1);
}

function getNutritionElements() {
  return {
    input: document.getElementById("nutritionSearchInput"),
    gramsInput: document.getElementById("nutritionGramsInput"),
    suggestions: document.getElementById("nutritionSearchResults"),
    selectedList: document.getElementById("nutritionSelectedIngredients"),
    estimateResults: document.getElementById("nutritionEstimateResults"),
  };
}

function renderSelectedIngredients() {
  const { selectedList } = getNutritionElements();
  if (!selectedList) {
    return;
  }

  if (!selectedIngredients.length) {
    selectedList.innerHTML = `<div class="empty-state">Add ingredients to build a nutrition estimate.</div>`;
    return;
  }

  selectedList.innerHTML = selectedIngredients
    .map(
      (item, index) => `
        <div class="nutrition-selected-item">
          <div>
            <div class="nutrition-selected-title">${escapeHtml(item.name)}</div>
            <div class="nutrition-selected-meta">${formatNumber(item.grams)} g</div>
          </div>
          <button type="button" class="secondary nutrition-remove-button" data-nutrition-remove="${index}">Remove</button>
        </div>
      `
    )
    .join("");
}

function clearNutritionComposer() {
  const { input, gramsInput, suggestions } = getNutritionElements();
  if (input) {
    input.value = "";
  }
  if (gramsInput) {
    gramsInput.value = "";
  }
  if (suggestions) {
    suggestions.innerHTML = "";
    suggestions.classList.add("hidden");
  }
}

function addSelectedIngredient() {
  const { input, gramsInput } = getNutritionElements();
  if (!input || !gramsInput) {
    return;
  }

  const name = input.value.trim();
  const grams = Number(gramsInput.value);

  if (!name || !grams || grams <= 0) {
    throw new Error("Enter a USDA ingredient and a gram quantity before adding it.");
  }

  selectedIngredients.push({ name, grams });
  renderSelectedIngredients();
  clearNutritionComposer();
}

export async function handleNutritionSearch() {
  const { input } = getNutritionElements();
  if (!input) {
    return;
  }

  const query = input.value.trim();
  if (!query) {
    renderNutritionSearchResults([]);
    return;
  }

  const results = await searchIngredientOptions(query);
  renderNutritionSearchResults(results);
}

export function renderNutritionSearchResults(results) {
  const { suggestions } = getNutritionElements();
  if (!suggestions) {
    return;
  }

  if (!results.length) {
    suggestions.innerHTML = "";
    suggestions.classList.add("hidden");
    return;
  }

  suggestions.innerHTML = results
    .map((result) => {
      const meta = [result.data_type, result.food_category || result.brand_owner, result.fdc_id ? `FDC ${result.fdc_id}` : ""]
        .filter(Boolean)
        .join(" • ");

      return `
        <button
          type="button"
          class="ingredient-suggestion-item"
          data-suggestion-value="${escapeHtml(result.description)}"
        >
          <span class="ingredient-suggestion-title">${escapeHtml(result.description)}</span>
          ${meta ? `<span class="ingredient-suggestion-meta">${escapeHtml(meta)}</span>` : ""}
        </button>
      `;
    })
    .join("");

  suggestions.classList.remove("hidden");
}

export async function handleNutritionEstimate() {
  if (!selectedIngredients.length) {
    renderNutritionEstimateResults(null, "Add at least one ingredient before estimating nutrition.");
    return;
  }

  const estimate = await estimateNutrition(selectedIngredients);
  renderNutritionEstimateResults(estimate);
}

export function renderNutritionEstimateResults(
  estimate,
  emptyMessage = "Add ingredients with gram amounts to estimate nutrition."
) {
  const { estimateResults: container } = getNutritionElements();

  if (!container) {
    return;
  }

  if (!estimate) {
    container.innerHTML = `<div class="empty-state">${escapeHtml(emptyMessage)}</div>`;
    return;
  }

  const totals = estimate.totals || {};
  const items = estimate.ingredients || [];

  container.innerHTML = `
    <div class="nutrition-table-shell">
      <table class="nutrition-summary-table">
        <thead>
          <tr>
            <th>Calories</th>
            <th>Protein (g)</th>
            <th>Fat (g)</th>
            <th>Carbs (g)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${formatNumber(totals.calories)}</td>
            <td>${formatNumber(totals.protein)}</td>
            <td>${formatNumber(totals.fat)}</td>
            <td>${formatNumber(totals.carbs)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="nutrition-table-shell">
      <table class="nutrition-estimate-table">
        <thead>
          <tr>
            <th>Grams</th>
            <th>Ingredient</th>
            <th>Matched USDA Food</th>
            <th>Calories</th>
            <th>Protein (g)</th>
            <th>Fat (g)</th>
            <th>Carbs (g)</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item) => `
                <tr>
                  <td>${formatNumber(item.grams)}</td>
                  <td>${escapeHtml(item.ingredient)}</td>
                  <td>${escapeHtml(item.matched_food || "No USDA match found")}</td>
                  <td>${formatNumber(item.calories)}</td>
                  <td>${formatNumber(item.protein)}</td>
                  <td>${formatNumber(item.fat)}</td>
                  <td>${formatNumber(item.carbs)}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

export function initializeNutritionWorkspace() {
  const { input, suggestions, selectedList } = getNutritionElements();
  const addButton = document.getElementById("nutritionAddButton");
  const clearButton = document.getElementById("nutritionClearButton");
  const estimateButton = document.getElementById("nutritionEstimateButton");

  if (!input || !suggestions || !selectedList || !addButton || !clearButton || !estimateButton) {
    return;
  }

  selectedIngredients = [];
  renderSelectedIngredients();
  renderNutritionEstimateResults(null);

  input.addEventListener("input", () => {
    if (searchTimerId) {
      window.clearTimeout(searchTimerId);
    }

    searchTimerId = window.setTimeout(() => {
      handleNutritionSearch().catch(() => {
        renderNutritionSearchResults([]);
      });
    }, 220);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    try {
      addSelectedIngredient();
    } catch (error) {
      renderNutritionEstimateResults(null, error instanceof Error ? error.message : String(error));
    }
  });

  input.addEventListener("focusout", () => {
    window.setTimeout(() => {
      suggestions.classList.add("hidden");
    }, 120);
  });

  suggestions.addEventListener("click", (event) => {
    const suggestionButton = event.target.closest("[data-suggestion-value]");
    if (!suggestionButton) {
      return;
    }

    input.value = suggestionButton.dataset.suggestionValue || "";
    suggestions.innerHTML = "";
    suggestions.classList.add("hidden");
  });

  selectedList.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-nutrition-remove]");
    if (!removeButton) {
      return;
    }

    const index = Number(removeButton.dataset.nutritionRemove);
    selectedIngredients.splice(index, 1);
    renderSelectedIngredients();
  });

  addButton.addEventListener("click", () => {
    try {
      addSelectedIngredient();
    } catch (error) {
      renderNutritionEstimateResults(null, error instanceof Error ? error.message : String(error));
    }
  });

  clearButton.addEventListener("click", () => {
    selectedIngredients = [];
    renderSelectedIngredients();
    clearNutritionComposer();
    renderNutritionEstimateResults(null);
  });

  estimateButton.addEventListener("click", async () => {
    try {
      await handleNutritionEstimate();
    } catch (error) {
      renderNutritionEstimateResults(null, error instanceof Error ? error.message : String(error));
    }
  });
}
