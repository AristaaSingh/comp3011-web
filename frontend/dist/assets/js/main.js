import {
  clearAuthState,
  createRecipe,
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
  handleNutritionSearch,
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
}

function setLockedRecipeFormState(message) {
  const form = document.getElementById("recipeForm");
  const output = document.getElementById("formOutput");
  const notice = document.getElementById("recipeFormNotice");

  if (!form || !output) {
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

  output.textContent = "";
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
  const estimateIngredients = getStructuredIngredientValues();
  let totals = {};

  if (estimateIngredients.length) {
    const estimate = await estimateRecipeNutrition(estimateIngredients);
    totals = estimate?.totals || {};
  }

  return {
    name: document.getElementById("name").value.trim(),
    description: document.getElementById("description").value.trim() || null,
    minutes: Number(document.getElementById("minutes").value),
    ingredients,
    steps: getRepeatableValues("step"),
    tags: getRepeatableValues("tag"),
    calories: totals.calories ?? null,
    protein: totals.protein ?? null,
    fat: totals.fat ?? null,
    carbs: totals.carbs ?? null
  };
}

async function updateRecipeNutritionPreview() {
  const container = document.getElementById("nutritionEstimateResults");
  if (!container) {
    return;
  }

  const ingredients = getRepeatableValues("ingredient");
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

function scheduleRecipeNutritionPreview() {
  const container = document.getElementById("nutritionEstimateResults");
  if (!container) {
    return;
  }

  if (recipeNutritionEstimateTimer) {
    window.clearTimeout(recipeNutritionEstimateTimer);
  }

  recipeNutritionEstimateTimer = window.setTimeout(() => {
    updateRecipeNutritionPreview().catch(() => {});
  }, 320);
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
    document.getElementById("formOutput").textContent = "Estimating nutrition from USDA ingredient data...";
    const payload = await buildRecipePayload();
    const data = recipeId
      ? await updateRecipe(recipeId, payload)
      : await createRecipe(payload);

    document.getElementById("formOutput").textContent = JSON.stringify(data, null, 2);
    resetForm();
    closeRecipeFormPanel();
    if (window.location.pathname.endsWith("recipe-form.html")) {
      window.location.href = `./recipe-detail.html?id=${data.id}`;
      return;
    }

    if (document.getElementById("recipesGrid")) {
      await loadRecipes();
    }
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

async function refreshAuthPanel() {
  const authCard = document.querySelector(".auth-card");
  const authPanel = document.getElementById("authPanel");
  const authSummary = document.getElementById("authUserSummary");
  const accountDisplayName = document.getElementById("accountDisplayName");
  const accountEmail = document.getElementById("accountEmail");
  const session = getAuthSession();

  updateAuthNavigation();

  if (!authCard || !authPanel || !authSummary || !accountDisplayName || !accountEmail) {
    return;
  }

  if (!session?.accessToken) {
    authCard.classList.remove("hidden");
    authPanel.classList.add("hidden");
    authSummary.textContent = "";
    accountDisplayName.value = "";
    accountEmail.value = "";
    return;
  }

  try {
    authCard.classList.add("hidden");
    const user = await fetchCurrentUser();
    authPanel.classList.remove("hidden");
    authSummary.textContent = `Signed in as ${user.display_name || user.email}`;
    accountDisplayName.value = user.display_name || "";
    accountEmail.value = user.email || "";
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
      display_name: document.getElementById("accountDisplayName").value.trim() || null,
      email: document.getElementById("accountEmail").value.trim()
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
    `;
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
      loadRecipes().catch((error) => showError("recipesGrid", error));
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      resetFilters();

      if (pageMode === "all") {
        loadRecipes().catch((error) => showError("recipesGrid", error));
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

  const refreshButton = document.getElementById("refreshRecipesButton");
  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      loadRecipes().catch((error) => showError("recipesGrid", error));
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
      if (fieldType === "ingredient") {
        scheduleRecipeNutritionPreview();
      }
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
    if (fieldType === "ingredient") {
      scheduleRecipeNutritionPreview();
    }
  });

  recipeForm.addEventListener("input", (event) => {
    const ingredientField = event.target.closest(".repeatable-input[data-suggestions-id], .repeatable-quantity-input");
    if (ingredientField) {
      scheduleRecipeNutritionPreview();
    }

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
    }, 220);

    ingredientAutocompleteTimers.set(field, timerId);
  });

  recipeForm.addEventListener("focusout", (event) => {
    const field = event.target.closest(".repeatable-input[data-suggestions-id]");
    if (!field) {
      return;
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

  const cancelButton = document.getElementById("cancelEditButton");
  if (cancelButton) {
    cancelButton.addEventListener("click", resetForm);
  }

  const recipeId = getCurrentRecipeId();
  if (recipeId) {
    editRecipe(recipeId)
      .then(() => {
        scheduleRecipeNutritionPreview();
      })
      .catch((error) => showError("formOutput", error));
  }

  renderNutritionEstimateResults(null, "Add ingredients and gram amounts to preview the nutrition estimate.");
  scheduleRecipeNutritionPreview();
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

  setAuthTab("login");
  refreshAuthPanel().catch((error) => {
    renderAuthStatus(error instanceof Error ? error.message : String(error), true);
  });
}

function initializeNutritionSection() {
  if (!document.getElementById("nutritionSearchButton") || !document.getElementById("nutritionEstimateButton")) {
    return;
  }

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

    if ((window.RECIPES_PAGE_CONFIG?.mode || "all") === "all") {
      loadRecipes().catch((error) => showError("recipesGrid", error));
    } else {
      showRecipeEmptyState("");
    }
  }
}

initializeApp();
