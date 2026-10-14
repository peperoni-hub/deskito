const settingsNameInput = document.getElementById("settings-name");
const themeOptions = document.querySelectorAll(".theme-option");
const showWelcomeButton = document.getElementById("show-welcome");

function markSelectedTheme() {
  const current = document.documentElement.dataset.theme;
  for (const option of themeOptions) {
    option.classList.toggle("selected", option.dataset.themeChoice === current);
  }
}

function fillSettings() {
  const profile = loadProfile();
  settingsNameInput.value = profile ? profile.name : "";
  markSelectedTheme();
}

settingsNameInput.addEventListener("change", () => {
  const profile = loadProfile() || {};
  profile.name = settingsNameInput.value.trim();
  localStorage.setItem("profile", JSON.stringify(profile));
  showUserName(profile);
});

for (const option of themeOptions) {
  option.addEventListener("click", () => {
    const theme = option.dataset.themeChoice;
    localStorage.setItem("theme", theme);
    applyTheme(theme, { animate: true });
    markSelectedTheme();
  });
}

showWelcomeButton.addEventListener("click", () => {
  showWelcome();
});

document.querySelector('.nav-item[data-view="settings"]').addEventListener("click", fillSettings);
