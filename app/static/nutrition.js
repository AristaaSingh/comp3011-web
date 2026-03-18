import { estimateNutrition, searchNutritionFoods } from "./api.js";
import { escapeHtml, parseLineSeparated } from "./utils.js";

export async function handleNutritionSearch() {
  const input = document.getElementById("nutritionSearchInput");
  const query = input.value.trim();

  if (!query) {
    renderNutritionSearchResults([]);
    return;
  }

  const results = await searchNutritionFoods(query);
  renderNutritionSearchResults(results);
}

export function renderNutritionSearchResults(results) {
  const container = document.getElementById("nutritionSearchResults");

  if (!results.length) {
    container.innerHTML = `<div class="empty-state">No nutrition matches found.</div>`;
    return;
  }

  container.innerHTML = results
    .map(
      (result) => `
        <article class="nutrition-result-card">
          <h3>${escapeHtml(result.description)}</h3>
          <div class="recipe-meta">
            <div><strong>FDC ID:</strong> ${result.fdc_id}</div>
            <div><strong>Type:</strong> ${escapeHtml(result.data_type || "Unknown")}</div>
          </div>
        </article>
      `
    )
    .join("");
}

export async function handleNutritionEstimate() {
  const ingredients = parseLineSeparated("nutritionEstimateIngredients");

  if (!ingredients.length) {
    renderNutritionEstimateResults(null);
    return;
  }

  const estimate = await estimateNutrition(ingredients);
  renderNutritionEstimateResults(estimate);
}

export function renderNutritionEstimateResults(estimate) {
  const output = document.getElementById("nutritionEstimateResults");

  if (!estimate) {
    output.textContent = "Enter one ingredient per line to estimate nutrition.";
    return;
  }

  output.textContent = JSON.stringify(estimate, null, 2);
}
