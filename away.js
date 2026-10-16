// Stops the timer when the computer was turned off or went to sleep, at the moment it went
// away, so those hours aren't counted. Phones and tablets are left out: they pause apps all
// the time, which doesn't mean you stopped working.
//
// While a timer runs, this device notes "still here" every 20 seconds (only on this device,
// it isn't synced). If the last note is older than the chosen minutes, the computer was away.

const HEARTBEAT_KEY = "timerLastSeen";
const HEARTBEAT_EVERY = 20000;

function isPhoneOrTablet() {
  const touchOnly = matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches;
  return touchOnly || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function readHeartbeat() {
  try {
    return JSON.parse(localStorage.getItem(HEARTBEAT_KEY) || "null");
  } catch {
    return null;
  }
}

function writeHeartbeat(now) {
  try {
    localStorage.setItem(HEARTBEAT_KEY, JSON.stringify({ start: running.start, at: now }));
  } catch {
    // Storage full or blocked; nothing we can do
  }
}

function stopBecauseAway(awaySince) {
  const before = { ...running, ...currentFields() };
  stopTimer(awaySince);
  const stoppedAt = formatTimeOfDay(awaySince);
  alertUser(t("Your computer was off or asleep, so the timer stopped at {time}.", { time: stoppedAt }), [
    {
      label: t("Keep counting"),
      primary: true,
      run: () => {
        // Undo: remove the entry and carry on with the same timer
        store.entries = store.entries.filter((entry) => !(entry.start === before.start && entry.end === Math.max(awaySince, before.start)));
        saveEntries();
        renderEntries();
        if (running) stopTimer();
        setTimerFields(before);
        running = { start: before.start, planId: before.planId || "" };
        saveRunning();
        showRunningState();
        writeHeartbeat(Date.now());
      },
    },
  ], { sticky: true });
}

function checkAway() {
  const now = Date.now();
  if (!running) {
    localStorage.removeItem(HEARTBEAT_KEY);
    return;
  }
  const last = readHeartbeat();
  // Only this device's own notes count (a timer started on another device has none yet)
  if (prefs.stopWhenAway && !isPhoneOrTablet() && last && last.start === running.start
      && now - last.at > prefs.awayStopMin * 60000) {
    stopBecauseAway(last.at);
    return;
  }
  writeHeartbeat(now);
}

setInterval(checkAway, HEARTBEAT_EVERY);
// Waking up from sleep: the page becomes visible again before the next beat
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") checkAway();
});
checkAway();
