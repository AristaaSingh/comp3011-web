import { estimateNutrition, searchNutritionFoods } from "./api.js";
import { escapeHtml } from "./utils.js";

function formatNumber(value) {
  if (value == null) {
    return "N/A";
  }

  return Number(value).toFixed(1);
}

function parseLineSeparated(id) {
  const element = document.getElementById(id);
  return (element?.value || "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
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
  const ingredients = parseLineSeparated("nutritionEstimateIngredients")
    .map((line) => {
      const match = line.match(/^(\d+(?:\.\d+)?)\s*g\s+(.+)$/i);
      if (!match) {
        return null;
      }

      return {
        grams: Number(match[1]),
        name: match[2].trim()
      };
    })
    .filter(Boolean);

  if (!ingredients.length) {
    renderNutritionEstimateResults(null);
    return;
  }

  const estimate = await estimateNutrition(ingredients);
  renderNutritionEstimateResults(estimate);
}

export function renderNutritionEstimateResults(
  estimate,
  emptyMessage = "Enter one ingredient per line to estimate nutrition."
) {
  const container = document.getElementById("nutritionEstimateResults");

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
