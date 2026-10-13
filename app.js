const descriptionInput = document.getElementById("description");
const clock = document.getElementById("clock");
const startStopButton = document.getElementById("start-stop");
const entryList = document.getElementById("entry-list");
const emptyMessage = document.getElementById("empty-message");

let startTime = null;
let tickInterval = null;
let entries = [];

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
  clock.textContent = formatDuration(Date.now() - startTime);
}

function startTimer() {
  startTime = Date.now();
  tickInterval = setInterval(updateClock, 1000);
  startStopButton.textContent = "STOP";
  startStopButton.classList.add("running");
}

function stopTimer() {
  clearInterval(tickInterval);
  entries.unshift({
    description: descriptionInput.value.trim(),
    start: startTime,
    end: Date.now(),
  });
  renderEntries();

  startTime = null;
  clock.textContent = "00:00:00";
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
