const welcome = document.getElementById("welcome");
const welcomeForm = document.getElementById("welcome-form");
const welcomeNameInput = document.getElementById("welcome-name");
const userName = document.getElementById("user-name");

const WELCOME_EXIT_MS = 1200;

function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem("profile"));
  } catch {
    return null;
  }
}

function showUserName(profile) {
  userName.textContent = profile.name;
}

// Preview the theme as soon as an answer is picked
welcomeForm.addEventListener("change", (event) => {
  if (event.target.name === "answer") {
    applyTheme(THEME_FOR_ANSWER[event.target.value], { animate: true });
  }
});

welcomeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const answer = welcomeForm.elements.answer.value;
  const profile = { name: welcomeNameInput.value.trim(), answer };
  const theme = THEME_FOR_ANSWER[answer];

  localStorage.setItem("profile", JSON.stringify(profile));
  localStorage.setItem("theme", theme);
  applyTheme(theme);
  showUserName(profile);

  // Fade the welcome screen out while the app slides in underneath
  welcome.classList.add("leaving");
  document.body.classList.add("app-entering");
  setTimeout(() => {
    welcome.hidden = true;
    welcome.classList.remove("leaving");
  }, WELCOME_EXIT_MS);
});

const profile = loadProfile();
if (profile) {
  showUserName(profile);
} else {
  welcome.hidden = false;
}
