const THEME_FOR_ANSWER = {
  woman: "feminine",
  man: "old-money",
  other: "neutral",
};

const THEME_FADE_MS = 800;
let themeFadeTimer = null;

// Briefly smooth out colour changes (theme or light/dark switches)
function fadeColors() {
  const root = document.documentElement;
  root.classList.add("theme-changing");
  clearTimeout(themeFadeTimer);
  themeFadeTimer = setTimeout(() => root.classList.remove("theme-changing"), THEME_FADE_MS);
}

function applyTheme(theme, { animate = false } = {}) {
  if (animate) fadeColors();
  document.documentElement.dataset.theme = theme;
}

function loadSavedTheme() {
  try {
    const saved = localStorage.getItem("theme");
    if (saved) {
      applyTheme(saved);
    }
  } catch {
    // No saved theme available, keep the default
  }
}

/* Light, dark, or follow the device ("system") */

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function savedAppearance() {
  try {
    return localStorage.getItem("appearance") || "system";
  } catch {
    return "system";
  }
}

function applyAppearance(choice = savedAppearance(), { animate = false } = {}) {
  if (animate) fadeColors();
  const dark = choice === "dark" || (choice === "system" && darkQuery.matches);
  document.documentElement.dataset.mode = dark ? "dark" : "light";
}

// When the device switches between light and dark, follow it (only in "system" mode)
darkQuery.addEventListener("change", () => {
  if (savedAppearance() === "system") applyAppearance("system", { animate: true });
});

loadSavedTheme();
applyAppearance();
