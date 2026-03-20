import {
  changeCurrentUserPassword,
  clearAuthState,
  createRecipe,
  deleteCurrentUserAccount,
  estimateNutrition as estimateRecipeNutrition,
  fetchCurrentUser,
  fetchRecipeById,
  getAuthSession,
  isAuthenticated,
  loginUser,
  registerUser,
  searchIngredientOptions,
  storeAuthSession,
  updateCurrentUser,
  updateRecipe
} from "./api.js";
import {
  deleteRecipe,
  editRecipe,
  loadRecipes,
  resetFilters,
  resetForm,
  showRecipeEmptyState
} from "./recipes.js";
import {
  handleNutritionEstimate,
  initializeNutritionWorkspace,
  renderNutritionEstimateResults
} from "./nutrition.js";
import {
  escapeHtml,
} from "./utils.js";

function updateAuthNavigation() {
  const authLink = document.querySelector("[data-auth-nav-link]");
  if (!authLink) {
    return;
  }

  authLink.textContent = isAuthenticated() ? "Account" : "Sign In";

  for (const link of document.querySelectorAll("[data-my-recipes-link]")) {
    link.classList.toggle("hidden", !isAuthenticated());
  }

  for (const link of document.querySelectorAll("[data-my-recipes-button]")) {
    link.classList.toggle("hidden", !isAuthenticated());
  }
}

function setLockedRecipeFormState(message) {
  const form = document.getElementById("recipeForm");
  const notice = document.getElementById("recipeFormNotice");

  if (!form) {
    return;
  }

  for (const field of form.querySelectorAll("input, textarea, button")) {
    if (field.id !== "clearFormButton") {
      field.disabled = true;
    }
  }

  if (notice) {
    notice.textContent = message;
    notice.classList.remove("hidden", "success");
    notice.classList.add("error");
  }
}

function setRecipeFormNotice(message = "", isError = false) {
  const notice = document.getElementById("recipeFormNotice");
  if (!notice) {
    return;
  }

  if (!message) {
    notice.textContent = "";
    notice.classList.add("hidden");
    notice.classList.remove("error", "success");
    return;
  }

  notice.textContent = message;
  notice.classList.remove("hidden", "error", "success");
  notice.classList.add(isError ? "error" : "success");
}

function setAuthTab(activeTab) {
  const tabs = document.querySelectorAll("[data-auth-tab]");
  const panels = document.querySelectorAll("[data-auth-panel]");

  if (!tabs.length || !panels.length) {
    return;
  }

  for (const tab of tabs) {
    const isActive = tab.dataset.authTab === activeTab;
    tab.classList.toggle("active", isActive);
    tab.classList.toggle("secondary", !isActive);
    tab.setAttribute("aria-pressed", isActive ? "true" : "false");
  }

  for (const panel of panels) {
    panel.classList.toggle("hidden", panel.dataset.authPanel !== activeTab);
  }
}

const repeatableFieldConfig = {
  tag: {
    listId: "tagsList",
    placeholder: "e.g. quick dinner",
    inputTag: "chip"
  },
  ingredient: {
    listId: "ingredientsList",
    placeholder: "Ingredient name",
    inputTag: "ingredient"
  },
  step: {
    listId: "stepsList",
    placeholder: "Describe one cooking step",
    inputTag: "textarea"
  }
};
let repeatableFieldId = 0;
const ingredientAutocompleteTimers = new WeakMap();
let recipeNutritionEstimateTimer = null;

function getRepeatableList(fieldType) {
  const config = repeatableFieldConfig[fieldType];
  return config ? document.getElementById(config.listId) : null;
}

function createRepeatableField(fieldType, value = "") {
  const config = repeatableFieldConfig[fieldType];
  if (!config) {
    return null;
  }

  if (config.inputTag === "chip") {
    const chip = document.createElement("div");
    chip.className = "tag-chip";
    chip.dataset.value = value;

    const text = document.createElement("span");
    text.textContent = value;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "tag-chip-remove";
    removeButton.dataset.removeField = fieldType;
    removeButton.setAttribute("aria-label", `Remove ${fieldType}`);
    removeButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 7h2v8h-2v-8zm4 0h2v8h-2v-8zM7 10h2v8H7v-8z"
          fill="currentColor"
        />
      </svg>
    `;

    chip.append(text, removeButton);
    return chip;
  }

  const row = document.createElement("div");
  row.className = "repeatable-item";

  if (config.inputTag === "ingredient") {
    const suggestionId = `ingredient-suggestions-${repeatableFieldId++}`;

    const quantityInput = document.createElement("input");
    quantityInput.type = "number";
    quantityInput.className = "repeatable-quantity-input";
    quantityInput.placeholder = "grams";
    quantityInput.step = "0.1";
    quantityInput.min = "0";

    const ingredientInput = document.createElement("input");
    ingredientInput.type = "text";
    ingredientInput.className = "repeatable-input";
    ingredientInput.placeholder = config.placeholder;
    ingredientInput.value = value;
    ingredientInput.dataset.suggestionsId = suggestionId;

    const ingredientShell = document.createElement("div");
    ingredientShell.className = "repeatable-field-shell";

    const suggestions = document.createElement("div");
    suggestions.id = suggestionId;
    suggestions.className = "ingredient-suggestions hidden";
    suggestions.setAttribute("role", "listbox");

    ingredientShell.append(ingredientInput, suggestions);

    const content = document.createElement("div");
    content.className = "ingredient-item-fields";
    content.append(quantityInput, ingredientShell);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "secondary remove-field-button";
    removeButton.dataset.removeField = fieldType;
    removeButton.textContent = "Remove";

    row.append(content, removeButton);
    return row;
  }

  const field =
    config.inputTag === "textarea"
      ? document.createElement("textarea")
      : document.createElement("input");

  if (config.inputTag === "input") {
    field.type = "text";
  } else {
    field.rows = 3;
  }

  field.className = "repeatable-input";
  field.placeholder = config.placeholder;
  field.value = value;

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "secondary remove-field-button";
  removeButton.dataset.removeField = fieldType;
  removeButton.textContent = "Remove";

  row.append(field, removeButton);
  return row;
}

async function populateIngredientSuggestions(field) {
  const query = field.value.trim();
  const suggestionsId = field.dataset.suggestionsId;
  if (!suggestionsId) {
    return;
  }

  const suggestions = document.getElementById(suggestionsId);
  if (!suggestions) {
    return;
  }

  if (query.length < 2) {
    suggestions.innerHTML = "";
    suggestions.classList.add("hidden");
    return;
  }

  try {
    const results = await searchIngredientOptions(query);
    const items = (results || [])
      .slice(0, 5)
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

    suggestions.innerHTML = items;
    suggestions.classList.toggle("hidden", !items);
  } catch {
    suggestions.innerHTML = "";
    suggestions.classList.add("hidden");
  }
}

function ensureRepeatableFieldCount(fieldType) {
  const list = getRepeatableList(fieldType);
  if (!list || list.children.length || fieldType === "tag") {
    return;
  }
  const row = createRepeatableField(fieldType);
  if (row) {
    list.append(row);
  }
}

function addRepeatableField(fieldType, value = "") {
  const list = getRepeatableList(fieldType);
  if (!list) {
    return;
  }
  if (fieldType === "tag") {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }

    const existingValues = new Set(getRepeatableValues("tag").map((item) => item.toLowerCase()));
    if (existingValues.has(normalized.toLowerCase())) {
      return;
    }
  }
  const row = createRepeatableField(fieldType, value);
  if (row) {
    list.append(row);
  }
}

function getRepeatableValues(fieldType) {
  const list = getRepeatableList(fieldType);
  if (!list) {
    return [];
  }

  if (fieldType === "tag") {
    return Array.from(list.querySelectorAll(".tag-chip"))
      .map((chip) => chip.dataset.value?.trim() || "")
      .filter(Boolean);
  }

  if (fieldType === "ingredient") {
    return Array.from(list.querySelectorAll(".repeatable-item"))
      .map((item) => {
        const quantity = item.querySelector(".repeatable-quantity-input")?.value.trim() || "";
        const ingredient = item.querySelector(".repeatable-input")?.value.trim() || "";
        if (!quantity && !ingredient) {
          return "";
        }
        return quantity && ingredient ? `${quantity} g ${ingredient}` : ingredient;
      })
      .filter(Boolean);
  }

  return Array.from(list.querySelectorAll(".repeatable-input"))
    .map((field) => field.value.trim())
    .filter(Boolean);
}

function getStructuredIngredientValues() {
  const list = getRepeatableList("ingredient");
  if (!list) {
    return [];
  }

  return Array.from(list.querySelectorAll(".repeatable-item"))
    .map((item) => {
      const gramsValue = item.querySelector(".repeatable-quantity-input")?.value || "";
      const name = item.querySelector(".repeatable-input")?.value.trim() || "";
      const grams = Number(gramsValue);

      if (!name || !Number.isFinite(grams) || grams <= 0) {
        return null;
      }

      return { name, grams };
    })
    .filter(Boolean);
}

function setRepeatableValues(fieldType, values = []) {
  const list = getRepeatableList(fieldType);
  if (!list) {
    return;
  }

  list.innerHTML = "";

  const sanitizedValues = values.filter((value) => String(value).trim());
  if (!sanitizedValues.length) {
    ensureRepeatableFieldCount(fieldType);
    return;
  }

  for (const value of sanitizedValues) {
    addRepeatableField(fieldType, value);
  }
}

async function buildRecipePayload() {
  const ingredients = getRepeatableValues("ingredient");

  return {
    name: document.getElementById("name").value.trim(),
    description: document.getElementById("description").value.trim() || null,
    minutes: Number(document.getElementById("minutes").value),
    ingredients,
    steps: getRepeatableValues("step"),
    tags: getRepeatableValues("tag")
  };
}

async function updateRecipeNutritionPreview() {
  const container = document.getElementById("nutritionEstimateResults");
  if (!container) {
    return;
  }

  const estimateIngredients = getStructuredIngredientValues();

  if (!estimateIngredients.length) {
    renderNutritionEstimateResults(null, "Add ingredients and gram amounts to preview the nutrition estimate.");
    return;
  }

  container.innerHTML = `<div class="empty-state">Estimating nutrition from USDA ingredient data...</div>`;

  try {
    const estimate = await estimateRecipeNutrition(estimateIngredients);
    renderNutritionEstimateResults(estimate, "Add ingredients and gram amounts to preview the nutrition estimate.");
  } catch {
    container.innerHTML = `<div class="empty-state">Could not estimate nutrition right now.</div>`;
  }
}

function getCurrentRecipeId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("recipeId") || params.get("id") || "";
}

function getRecipeSearchParams() {
  const params = new URLSearchParams();
  const searchInput = document.getElementById("searchInput");
  const tagInput = document.getElementById("tagFilter");
  const minutesInput = document.getElementById("minutesFilter");

  if (searchInput?.value.trim()) {
    params.set("search", searchInput.value.trim());
  }

  if (tagInput?.value.trim()) {
    params.set("tag", tagInput.value.trim());
  }

  if (minutesInput?.value.trim()) {
    params.set("minutes", minutesInput.value.trim());
  }

  return params;
}

function applyRecipeFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const searchInput = document.getElementById("searchInput");
  const tagInput = document.getElementById("tagFilter");
  const minutesInput = document.getElementById("minutesFilter");

  if (searchInput) {
    searchInput.value = params.get("search") || "";
  }

  if (tagInput) {
    tagInput.value = params.get("tag") || "";
  }

  if (minutesInput) {
    minutesInput.value = params.get("minutes") || "";
  }
}

function redirectToRecipeResults() {
  const params = getRecipeSearchParams();
  const query = params.toString();
  window.location.href = query ? `./results.html?${query}` : "./results.html";
}

function showError(targetId, error) {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }
  target.textContent = error instanceof Error ? error.message : String(error);
}

function openRecipeFormPanel() {
  const panel = document.getElementById("recipeFormPanel");
  if (panel) {
    panel.open = true;
  }
}

function closeRecipeFormPanel() {
  const panel = document.getElementById("recipeFormPanel");
  if (panel) {
    panel.open = false;
  }
}

async function handleRecipeSubmit(event) {
  event.preventDefault();

  const recipeId = document.getElementById("recipeId").value;

  try {
    setRecipeFormNotice("Saving recipe with USDA-backed nutrition estimates...");
    const payload = await buildRecipePayload();
    const data = recipeId
      ? await updateRecipe(recipeId, payload)
      : await createRecipe(payload);

    setRecipeFormNotice("");
    resetForm();
    closeRecipeFormPanel();
    if (window.location.pathname.endsWith("recipe-form.html")) {
      const redirectParam = recipeId ? "updatedId" : "createdId";
      window.location.href = `./my-recipes.html?${redirectParam}=${data.id}`;
      return;
    }

    if (document.getElementById("recipesGrid")) {
      await loadRecipes();
    }
  } catch (error) {
    setRecipeFormNotice(error instanceof Error ? error.message : String(error), true);
  }
}

async function handleRecipesGridClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  const recipeId = Number(button.dataset.recipeId);

  try {
    if (button.dataset.action === "delete-recipe") {
      await deleteRecipe(recipeId);
    }
  } catch (error) {
    showError("recipesGrid", error);
  }
}

function renderAuthStatus(message, isError = false) {
  const authStatus = document.getElementById("authStatus");
  if (!authStatus) {
    return;
  }

  authStatus.textContent = message;
  authStatus.classList.remove("hidden", "error", "success");
  authStatus.classList.add(isError ? "error" : "success");
}

function renderRecipePageStatus(message, isError = false) {
  const status = document.getElementById("recipePageStatus");
  if (!status) {
    return;
  }

  if (!message) {
    status.textContent = "";
    status.classList.add("hidden");
    status.classList.remove("error", "success");
    return;
  }

  status.textContent = message;
  status.classList.remove("hidden", "error", "success");
  status.classList.add(isError ? "error" : "success");
}

async function refreshAuthPanel() {
  const authCard = document.querySelector(".auth-card");
  const authPanel = document.getElementById("authPanel");
  const authSummary = document.getElementById("authUserSummary");
  const accountDisplayName = document.getElementById("accountDisplayName");
  const accountEmail = document.getElementById("accountEmail");
  const passwordForm = document.getElementById("passwordForm");
  const deleteAccountForm = document.getElementById("deleteAccountForm");
  const session = getAuthSession();

  updateAuthNavigation();

  if (!authCard || !authPanel || !authSummary || !accountDisplayName || !accountEmail || !passwordForm || !deleteAccountForm) {
    return;
  }

  if (!session?.accessToken) {
    authCard.classList.remove("hidden");
    authPanel.classList.add("hidden");
    authSummary.textContent = "";
    accountDisplayName.value = "";
    accountEmail.value = "";
    passwordForm.reset();
    deleteAccountForm.reset();
    return;
  }

  try {
    authCard.classList.add("hidden");
    const user = await fetchCurrentUser();
    authPanel.classList.remove("hidden");
    authSummary.textContent = `Signed in as ${user.display_name || user.email}`;
    accountDisplayName.value = user.display_name || "";
    accountEmail.value = user.email || "";
    passwordForm.reset();
    deleteAccountForm.reset();
    storeAuthSession({
      access_token: session.accessToken,
      user
    });
    renderAuthStatus("Authenticated successfully.");
  } catch (error) {
    clearAuthState();
    updateAuthNavigation();
    authCard.classList.remove("hidden");
    authPanel.classList.add("hidden");
    renderAuthStatus(error instanceof Error ? error.message : String(error), true);
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();

  try {
    const payload = await loginUser({
      email: document.getElementById("loginEmail").value.trim(),
      password: document.getElementById("loginPassword").value
    });
    storeAuthSession(payload);
    document.getElementById("loginForm").reset();
    await refreshAuthPanel();
  } catch (error) {
    renderAuthStatus(error instanceof Error ? error.message : String(error), true);
  }
}

async function handleRegisterSubmit(event) {
  event.preventDefault();

  try {
    const payload = await registerUser({
      email: document.getElementById("registerEmail").value.trim(),
      password: document.getElementById("registerPassword").value
    });
    storeAuthSession(payload);
    document.getElementById("registerForm").reset();
    await refreshAuthPanel();
  } catch (error) {
    renderAuthStatus(error instanceof Error ? error.message : String(error), true);
  }
}

async function handleAccountSubmit(event) {
  event.preventDefault();

  try {
    const user = await updateCurrentUser({
      display_name: document.getElementById("accountDisplayName").value.trim() || null
    });
    const session = getAuthSession();
    if (session?.accessToken) {
      storeAuthSession({
        access_token: session.accessToken,
        user
      });
    }
    await refreshAuthPanel();
    renderAuthStatus("Account updated successfully.");
  } catch (error) {
    renderAuthStatus(error instanceof Error ? error.message : String(error), true);
  }
}

async function handlePasswordSubmit(event) {
  event.preventDefault();

  try {
    await changeCurrentUserPassword({
      current_password: document.getElementById("currentPassword").value,
      new_password: document.getElementById("newPassword").value
    });
    document.getElementById("passwordForm").reset();
    renderAuthStatus("Password updated successfully.");
  } catch (error) {
    renderAuthStatus(error instanceof Error ? error.message : String(error), true);
  }
}

async function handleDeleteAccount(event) {
  event.preventDefault();

  const password = document.getElementById("deleteAccountPassword").value;
  if (!password) {
    renderAuthStatus("Please enter your password to delete the account.", true);
    return;
  }

  if (!window.confirm("Delete your account and all recipes you created? This cannot be undone.")) {
    return;
  }

  try {
    await deleteCurrentUserAccount({ password });
    clearAuthState();
    updateAuthNavigation();
    document.getElementById("deleteAccountForm").reset();
    await refreshAuthPanel();
    renderAuthStatus("Account deleted successfully.");
  } catch (error) {
    renderAuthStatus(error instanceof Error ? error.message : String(error), true);
  }
}

function handleLogout() {
  clearAuthState();
  updateAuthNavigation();
  renderAuthStatus("Logged out.");
  refreshAuthPanel().catch(() => {});
}

async function initializeRecipeDetailPage() {
  const config = window.RECIPE_DETAIL_CONFIG;
  const title = document.getElementById("recipeDetailTitle");
  const content = document.getElementById("recipeDetailContent");
  const editLink = document.getElementById("editRecipeLink");

  if (!config || !title || !content || !editLink) {
    return;
  }

  try {
    const recipe = await fetchRecipeById(config.recipeId);
    const currentUserId = getAuthSession()?.user?.id;
    title.textContent = recipe.name;
    editLink.href = `./recipe-form.html?recipeId=${recipe.id}`;
    if (!isAuthenticated() || currentUserId !== recipe.owner_id) {
      editLink.classList.add("hidden");
    }

    content.innerHTML = `
      <div class="recipe-meta">
        <div><strong>Minutes:</strong> ${recipe.minutes}</div>
        <div><strong>Ingredients:</strong> ${recipe.n_ingredients ?? (recipe.ingredients?.length || 0)}</div>
      </div>
      <p>${escapeHtml(recipe.description || "No description available.")}</p>
      <div class="recipe-tags">
        ${(recipe.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
      <section class="subpanel">
        <h3>Ingredients</h3>
        <ul>
          ${(recipe.ingredients || []).map((ingredient) => `<li>${escapeHtml(ingredient)}</li>`).join("")}
        </ul>
      </section>
      <section class="subpanel">
        <h3>Steps</h3>
        <ol>
          ${(recipe.steps || []).map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
        </ol>
      </section>
      <section class="subpanel">
        <h3>Nutrition breakdown</h3>
        <div id="recipeDetailNutrition"></div>
      </section>
    `;

    const detailNutritionContainer = document.getElementById("recipeDetailNutrition");
    if (detailNutritionContainer) {
      const parsedIngredients = (recipe.ingredients || []).map((ingredient) => {
        const text = String(ingredient || "").trim();
        const match = text.match(/^(\d+(?:\.\d+)?)\s*g\s+(.+)$/i);

        return match
          ? {
              grams: Number(match[1]),
              name: match[2].trim()
            }
          : null;
      });

      if (parsedIngredients.length && parsedIngredients.every(Boolean)) {
        const estimate = await estimateRecipeNutrition(parsedIngredients);
        const originalId = detailNutritionContainer.id;
        detailNutritionContainer.id = "nutritionEstimateResults";
        renderNutritionEstimateResults(
          estimate,
          "No nutrition data available for this recipe."
        );
        detailNutritionContainer.id = originalId;
      } else {
        detailNutritionContainer.innerHTML = `
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
                  <td>${recipe.calories != null ? Number(recipe.calories).toFixed(1) : "N/A"}</td>
                  <td>${recipe.protein != null ? Number(recipe.protein).toFixed(1) : "N/A"}</td>
                  <td>${recipe.fat != null ? Number(recipe.fat).toFixed(1) : "N/A"}</td>
                  <td>${recipe.carbs != null ? Number(recipe.carbs).toFixed(1) : "N/A"}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="empty-state">
            This recipe was saved without gram-based ingredient quantities, so an exact per-ingredient USDA breakdown is not available.
          </div>
        `;
      }
    }
  } catch (error) {
    title.textContent = "Recipe not found";
    showError("recipeDetailContent", error);
  }
}

function initializeRecipeSection() {
  const pageMode = window.RECIPES_PAGE_CONFIG?.mode || "all";
  const hasRecipeGrid = Boolean(document.getElementById("recipesGrid"));
  const searchButton = document.getElementById("searchRecipesButton");
  const resetButton = document.getElementById("resetFiltersButton");
  const searchParams = new URLSearchParams(window.location.search);

  if (pageMode === "landing") {
    if (searchButton) {
      searchButton.addEventListener("click", redirectToRecipeResults);
    }

    if (resetButton) {
      resetButton.addEventListener("click", () => {
        resetFilters();
      });
    }

    return;
  }
  
  if (!hasRecipeGrid) {
    return;
  }

  if (pageMode === "mine" && !isAuthenticated()) {
    showRecipeEmptyState("Sign in to view the recipes you created.");
    return;
  }

  if (pageMode === "mine") {
    if (searchParams.has("createdId")) {
      renderRecipePageStatus("Recipe added successfully.");
    } else if (searchParams.has("updatedId")) {
      renderRecipePageStatus("Recipe updated successfully.");
    } else {
      renderRecipePageStatus("");
    }
  }

  const recipeForm = document.getElementById("recipeForm");
  if (recipeForm) {
    recipeForm.addEventListener("submit", handleRecipeSubmit);
  }

  const openFormButton = document.getElementById("openRecipeFormButton");
  if (openFormButton) {
    openFormButton.addEventListener("click", () => {
      resetForm();
      openRecipeFormPanel();
    });
  }

  if (searchButton) {
    searchButton.addEventListener("click", () => {
      loadRecipes(pageMode).catch((error) => showError("recipesGrid", error));
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      resetFilters();

      if (pageMode === "all") {
        loadRecipes(pageMode).catch((error) => showError("recipesGrid", error));
      } else {
        showRecipeEmptyState("");
      }
    });
  }

  const clearButton = document.getElementById("clearFormButton");
  if (clearButton) {
    clearButton.addEventListener("click", resetForm);
  }

  const cancelButton = document.getElementById("cancelEditButton");
  if (cancelButton) {
    cancelButton.addEventListener("click", () => {
      resetForm();
      closeRecipeFormPanel();
    });
  }

  document.getElementById("recipesGrid").addEventListener("click", handleRecipesGridClick);
}

function initializeRecipeFormPage() {
  const recipeForm = document.getElementById("recipeForm");
  if (!recipeForm || document.getElementById("recipesGrid")) {
    return;
  }

  ensureRepeatableFieldCount("tag");
  ensureRepeatableFieldCount("ingredient");
  ensureRepeatableFieldCount("step");

  for (const button of document.querySelectorAll("[data-add-field]")) {
    button.addEventListener("click", () => {
      const fieldType = button.dataset.addField || "";
      if (fieldType === "tag") {
        const input = document.getElementById("tagInputField");
        if (!input) {
          return;
        }
        addRepeatableField("tag", input.value);
        input.value = "";
        return;
      }

      addRepeatableField(fieldType);
    });
  }

  const tagInput = document.getElementById("tagInputField");
  if (tagInput) {
    tagInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      addRepeatableField("tag", tagInput.value);
      tagInput.value = "";
    });
  }

  recipeForm.addEventListener("click", (event) => {
    const suggestionButton = event.target.closest("[data-suggestion-value]");
    if (suggestionButton) {
      const wrapper = suggestionButton.closest(".repeatable-field-shell");
      const field = wrapper?.querySelector(".repeatable-input");
      const suggestions = wrapper?.querySelector(".ingredient-suggestions");

      if (field) {
        field.value = suggestionButton.dataset.suggestionValue || "";
      }

      if (suggestions) {
        suggestions.innerHTML = "";
        suggestions.classList.add("hidden");
      }

      return;
    }

    const removeButton = event.target.closest("[data-remove-field]");
    if (!removeButton) {
      return;
    }

    const fieldType = removeButton.dataset.removeField || "";
    const list = getRepeatableList(fieldType);
    const item = removeButton.closest(".repeatable-item, .tag-chip");

    if (!list || !item) {
      return;
    }

    item.remove();
    ensureRepeatableFieldCount(fieldType);
  });

  recipeForm.addEventListener("input", (event) => {
    const field = event.target.closest(".repeatable-input[data-suggestions-id]");
    if (!field) {
      return;
    }

    const existingTimer = ingredientAutocompleteTimers.get(field);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    const timerId = window.setTimeout(() => {
      populateIngredientSuggestions(field).catch(() => {});
    }, 380);

    ingredientAutocompleteTimers.set(field, timerId);
  });

  recipeForm.addEventListener("focusout", (event) => {
    const field = event.target.closest(".repeatable-input[data-suggestions-id]");
    if (!field) {
      return;
    }

    const existingTimer = ingredientAutocompleteTimers.get(field);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    const query = field.value.trim();
    if (query.length >= 2) {
      populateIngredientSuggestions(field).catch(() => {});
    }

    const wrapper = field.closest(".repeatable-field-shell");
    const suggestions = wrapper?.querySelector(".ingredient-suggestions");
    if (!suggestions) {
      return;
    }

    window.setTimeout(() => {
      suggestions.classList.add("hidden");
    }, 120);
  });

  if (!isAuthenticated()) {
    setLockedRecipeFormState("Sign in on the Account page before creating or editing recipes.");
    return;
  }

  recipeForm.addEventListener("submit", handleRecipeSubmit);

  const clearButton = document.getElementById("clearFormButton");
  if (clearButton) {
    clearButton.addEventListener("click", resetForm);
  }

  const estimateButton = document.getElementById("estimateRecipeNutritionButton");
  if (estimateButton) {
    estimateButton.addEventListener("click", () => {
      updateRecipeNutritionPreview().catch(() => {});
    });
  }

  const cancelButton = document.getElementById("cancelEditButton");
  if (cancelButton) {
    cancelButton.addEventListener("click", resetForm);
  }

  const recipeId = getCurrentRecipeId();
  if (recipeId) {
    editRecipe(recipeId)
      .then(() => {})
      .catch((error) => setRecipeFormNotice(error instanceof Error ? error.message : String(error), true));
  }

  renderNutritionEstimateResults(null, "Add ingredients and gram amounts to preview the nutrition estimate.");
}

function initializeAuthPage() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (!loginForm || !registerForm) {
    updateAuthNavigation();
    return;
  }

  loginForm.addEventListener("submit", handleLoginSubmit);
  registerForm.addEventListener("submit", handleRegisterSubmit);

  for (const tab of document.querySelectorAll("[data-auth-tab]")) {
    tab.addEventListener("click", () => {
      setAuthTab(tab.dataset.authTab || "login");
    });
  }

  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }

  const accountForm = document.getElementById("accountForm");
  if (accountForm) {
    accountForm.addEventListener("submit", handleAccountSubmit);
  }

  const passwordForm = document.getElementById("passwordForm");
  if (passwordForm) {
    passwordForm.addEventListener("submit", handlePasswordSubmit);
  }

  const deleteAccountForm = document.getElementById("deleteAccountForm");
  if (deleteAccountForm) {
    deleteAccountForm.addEventListener("submit", handleDeleteAccount);
  }

  setAuthTab("login");
  refreshAuthPanel().catch((error) => {
    renderAuthStatus(error instanceof Error ? error.message : String(error), true);
  });
}

function initializeNutritionSection() {
  if (!document.getElementById("nutritionEstimateButton")) {
    return;
  }
  initializeNutritionWorkspace();
}

function initializeApp() {
  updateAuthNavigation();
  const detailId = getCurrentRecipeId();
  if (detailId && document.getElementById("recipeDetailTitle")) {
    window.RECIPE_DETAIL_CONFIG = { recipeId: detailId };
  }

  initializeRecipeSection();
  initializeRecipeFormPage();
  initializeNutritionSection();
  initializeAuthPage();
  initializeRecipeDetailPage().catch((error) => showError("recipeDetailContent", error));

  if (document.getElementById("recipesGrid")) {
    applyRecipeFiltersFromUrl();

    const pageMode = window.RECIPES_PAGE_CONFIG?.mode || "all";

    if (pageMode === "all") {
      loadRecipes(pageMode).catch((error) => showError("recipesGrid", error));
    } else if (pageMode === "mine") {
      if (isAuthenticated()) {
        loadRecipes(pageMode).catch((error) => showError("recipesGrid", error));
      } else {
        showRecipeEmptyState("Sign in to view the recipes you created.");
      }
    } else {
      showRecipeEmptyState("");
    }
  }
}

initializeApp();
