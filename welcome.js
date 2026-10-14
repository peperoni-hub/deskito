const welcome = document.getElementById("welcome");
const welcomeForm = document.getElementById("welcome-form");
const welcomeNameInput = document.getElementById("welcome-name");
const userName = document.getElementById("user-name");

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
    applyTheme(THEME_FOR_ANSWER[event.target.value]);
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
  welcome.hidden = true;
});

const profile = loadProfile();
if (profile) {
  showUserName(profile);
} else {
  welcome.hidden = false;
}
