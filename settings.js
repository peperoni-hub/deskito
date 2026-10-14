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

// Any input with data-pref="name" reads and saves that preference
for (const input of document.querySelectorAll("[data-pref]")) {
  const key = input.dataset.pref;
  if (input.type === "checkbox") {
    input.checked = prefs[key];
  } else {
    input.value = prefs[key];
  }
  input.addEventListener("change", () => {
    if (input.type === "checkbox") {
      prefs[key] = input.checked;
    } else if (input.type === "number") {
      prefs[key] = Math.max(Number(input.min) || 1, Number(input.value) || prefs[key]);
      input.value = prefs[key];
    } else {
      prefs[key] = input.value;
    }
    savePrefs();
  });
}
