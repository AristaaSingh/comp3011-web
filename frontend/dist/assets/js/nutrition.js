import { estimateNutrition, searchNutritionFoods } from "./api.js";
import { escapeHtml, parseLineSeparated } from "./utils.js";

function formatNumber(value) {
  if (value == null) {
    return "N/A";
  }

  return Number(value).toFixed(1);
}

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
  const container = document.getElementById("nutritionEstimateResults");

  if (!estimate) {
    container.innerHTML = `<div class="empty-state">Enter one ingredient per line to estimate nutrition.</div>`;
    return;
  }

  const totals = estimate.totals || {};
  const items = estimate.ingredients || [];

  container.innerHTML = `
    <div class="nutrition-totals-grid">
      <article class="nutrition-total-card"><strong>Calories</strong><div>${formatNumber(totals.calories)}</div></article>
      <article class="nutrition-total-card"><strong>Protein</strong><div>${formatNumber(totals.protein)} g</div></article>
      <article class="nutrition-total-card"><strong>Fat</strong><div>${formatNumber(totals.fat)} g</div></article>
      <article class="nutrition-total-card"><strong>Carbs</strong><div>${formatNumber(totals.carbs)} g</div></article>
    </div>
    <div class="nutrition-item-grid">
      ${items
        .map(
          (item) => `
            <article class="nutrition-item-card">
              <h3>${escapeHtml(item.ingredient)}</h3>
              <div class="recipe-meta">
                <div><strong>Matched food:</strong> ${escapeHtml(item.matched_food || "No USDA match found")}</div>
                <div><strong>FDC ID:</strong> ${item.fdc_id ?? "N/A"}</div>
              </div>
              <div class="recipe-meta">
                <div><strong>Calories:</strong> ${formatNumber(item.calories)}</div>
                <div><strong>Protein:</strong> ${formatNumber(item.protein)} g</div>
                <div><strong>Fat:</strong> ${formatNumber(item.fat)} g</div>
                <div><strong>Carbs:</strong> ${formatNumber(item.carbs)} g</div>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}
