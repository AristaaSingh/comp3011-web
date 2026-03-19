import {
  clearAuthState,
  createRecipe,
  fetchCurrentUser,
  fetchRecipeById,
  getAuthSession,
  isAuthenticated,
  loginUser,
  registerUser,
  storeAuthSession,
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
  parseCommaSeparated,
  parseOptionalNumber
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
  const payload = buildRecipePayload();

  try {
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
  const session = getAuthSession();

  updateAuthNavigation();

  if (!authCard || !authPanel || !authSummary) {
    return;
  }

  if (!session?.accessToken) {
    authCard.classList.remove("hidden");
    authPanel.classList.add("hidden");
    authSummary.textContent = "";
    return;
  }

  try {
    authCard.classList.add("hidden");
    const user = await fetchCurrentUser();
    authPanel.classList.remove("hidden");
    authSummary.textContent = `Signed in as ${user.email}`;
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
    title.textContent = recipe.name;
    editLink.href = `./recipe-form.html?recipeId=${recipe.id}`;
    if (!isAuthenticated()) {
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
    editRecipe(recipeId).catch((error) => showError("formOutput", error));
  }
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
