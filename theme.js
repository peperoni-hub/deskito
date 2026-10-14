const THEME_FOR_ANSWER = {
  woman: "feminine",
  man: "old-money",
  other: "neutral",
};

const THEME_FADE_MS = 800;
let themeFadeTimer = null;

function applyTheme(theme, { animate = false } = {}) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add("theme-changing");
    clearTimeout(themeFadeTimer);
    themeFadeTimer = setTimeout(() => root.classList.remove("theme-changing"), THEME_FADE_MS);
  }
  root.dataset.theme = theme;
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

loadSavedTheme();
