const THEME_FOR_ANSWER = {
  woman: "feminine",
  man: "old-money",
  other: "neutral",
};

function applyTheme(theme) {
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

loadSavedTheme();
