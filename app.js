const descriptionInput = document.getElementById("description");
const clock = document.getElementById("clock");
const startStopButton = document.getElementById("start-stop");

let startTime = null;
let tickInterval = null;

function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
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
