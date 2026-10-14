const descriptionInput = document.getElementById("description");
const clockMain = document.getElementById("clock-main");
const clockFraction = document.getElementById("clock-fraction");
const startStopButton = document.getElementById("start-stop");
const entryList = document.getElementById("entry-list");
const emptyMessage = document.getElementById("empty-message");

let startTime = null;
let frameRequest = null;
let entries = loadEntries();

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem("entries")) || [];
  } catch {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem("entries", JSON.stringify(entries));
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

function formatTimeOfDay(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderEntries() {
  entryList.innerHTML = "";
  emptyMessage.hidden = entries.length > 0;

  for (const entry of entries) {
    const item = document.createElement("li");
    item.className = "entry";

    const description = document.createElement("span");
    description.className = "entry-description";
    if (entry.description) {
      description.textContent = entry.description;
    } else {
      description.textContent = "(no description)";
      description.classList.add("no-description");
    }

    const times = document.createElement("span");
    times.className = "entry-times";
    times.textContent = `${formatTimeOfDay(entry.start)} - ${formatTimeOfDay(entry.end)}`;

    const duration = document.createElement("span");
    duration.className = "entry-duration";
    duration.textContent = formatDuration(entry.end - entry.start);

    item.append(description, times, duration);
    entryList.append(item);
  }
}

function updateClock() {
  const elapsed = Date.now() - startTime;
  clockMain.textContent = formatDuration(elapsed);
  clockFraction.textContent = "." + String(Math.floor((elapsed % 1000) / 10)).padStart(2, "0");
  frameRequest = requestAnimationFrame(updateClock);
}

function startTimer() {
  startTime = Date.now();
  frameRequest = requestAnimationFrame(updateClock);
  startStopButton.textContent = "STOP";
  startStopButton.classList.add("running");
}

function stopTimer() {
  cancelAnimationFrame(frameRequest);
  entries.unshift({
    description: descriptionInput.value.trim(),
    start: startTime,
    end: Date.now(),
  });
  saveEntries();
  renderEntries();

  startTime = null;
  clockMain.textContent = "00:00:00";
  clockFraction.textContent = ".00";
  descriptionInput.value = "";
  startStopButton.textContent = "START";
  startStopButton.classList.remove("running");
}

startStopButton.addEventListener("click", () => {
  if (startTime === null) {
    startTimer();
  } else {
    stopTimer();
  }
});

renderEntries();
