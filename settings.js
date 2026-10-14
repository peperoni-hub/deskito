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

/* Backup and restore everything (also used to move data to another browser) */

const BACKUP_KEYS = ["entries", "projects", "tags", "plans", "prefs", "profile", "theme"];
const backupButton = document.getElementById("backup-download");
const restoreInput = document.getElementById("backup-restore");

backupButton.addEventListener("click", () => {
  const backup = { app: "deskito", savedAt: new Date().toISOString(), data: {} };
  for (const key of BACKUP_KEYS) {
    backup.data[key] = localStorage.getItem(key);
  }
  downloadFile(`deskito-backup-${dayKey(Date.now())}.json`, JSON.stringify(backup, null, 2), "application/json");
});

restoreInput.addEventListener("change", async () => {
  const file = restoreInput.files[0];
  restoreInput.value = "";
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    if (backup.app !== "deskito" || !backup.data) throw new Error("not a Deskito backup");
    if (!confirm("Replace everything in this browser with the backup? This cannot be undone.")) return;
    for (const key of BACKUP_KEYS) {
      if (backup.data[key] == null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, backup.data[key]);
      }
    }
    location.reload();
  } catch {
    alert("That file isn't a Deskito backup.");
  }
});
