// Pomodoro, automatic break alarm, reminders and pop-up messages

const pomoPhase = document.getElementById("pomo-phase");
const pomoTime = document.getElementById("pomo-time");
const pomoStartButton = document.getElementById("pomo-start");
const pomoResetButton = document.getElementById("pomo-reset");
const pomoPresets = document.querySelectorAll(".pomo-preset");
const pomoWorkInput = document.getElementById("pomo-work");
const pomoBreakInput = document.getElementById("pomo-break");
const toasts = document.getElementById("toasts");
const notifyButton = document.getElementById("allow-notifications");

/* Pop-up messages, sound and desktop notifications */

function showToast(message, actions = [], { sticky = false } = {}) {
  const toast = el("div", { class: "toast" }, el("span", { class: "toast-message" }, message));
  const close = () => toast.remove();
  const buttons = el("div", { class: "toast-actions" });
  for (const action of actions) {
    buttons.append(el("button", {
      class: action.primary ? "start-button small" : "secondary-button small",
      onclick: () => {
        close();
        action.run?.();
      },
    }, action.label));
  }
  if (!sticky) {
    buttons.append(el("button", { class: "secondary-button small", onclick: close }, "OK"));
    setTimeout(close, 15000);
  }
  toast.append(buttons);
  toasts.append(toast);
  return toast;
}

let audioContext = null;

// Browsers only allow sound after the first click, so get it ready then
document.addEventListener("pointerdown", () => {
  try {
    audioContext ||= new AudioContext();
    audioContext.resume();
  } catch {
    // No sound available
  }
}, { once: true });

function chime() {
  try {
    audioContext ||= new AudioContext();
    const now = audioContext.currentTime;
    [660, 880, 990].forEach((frequency, i) => {
      const at = now + i * 0.22;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.6);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.65);
    });
  } catch {
    // Sound is a bonus; ignore if the browser blocks it
  }
}

function alertUser(message, actions, options) {
  chime();
  if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
    new Notification("Deskito", { body: message });
  }
  return showToast(message, actions, options);
}

notifyButton.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    showToast("This browser doesn't support desktop notifications.");
    return;
  }
  const result = await Notification.requestPermission();
  showToast(result === "granted" ? "Desktop notifications are on." : "Notifications were not allowed.");
});

/* Pomodoro */

const pomo = { active: false, paused: false, phase: "focus", endsAt: 0, remaining: 0, focusFields: null };

function phaseLength(phase) {
  return (phase === "focus" ? prefs.pomoWork : prefs.pomoBreak) * 60000;
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
}

function renderPomo() {
  let left = phaseLength("focus");
  if (pomo.active) {
    left = pomo.paused ? pomo.remaining : pomo.endsAt - Date.now();
  }
  pomoTime.textContent = formatCountdown(left);
  pomoPhase.textContent = pomo.phase === "focus" ? "Focus" : "Break";
  pomoPhase.classList.toggle("on-break", pomo.phase === "break");
  pomoStartButton.textContent = !pomo.active ? "START FOCUS" : pomo.paused ? "RESUME" : "PAUSE";
  for (const preset of pomoPresets) {
    preset.classList.toggle("selected",
      Number(preset.dataset.work) === prefs.pomoWork && Number(preset.dataset.break) === prefs.pomoBreak);
  }
}

function startPhase(phase) {
  pomo.active = true;
  pomo.paused = false;
  pomo.phase = phase;
  pomo.endsAt = Date.now() + phaseLength(phase);

  if (prefs.pomoTrack) {
    if (phase === "focus") {
      if (pomo.focusFields) {
        continueEntry(pomo.focusFields);
      } else if (!running) {
        startTimer();
      }
    } else {
      pomo.focusFields = currentFields();
      if (running) stopTimer();
      setTimerFields({ description: "Pomodoro break", type: "break" });
      startTimer();
    }
  }
  renderPomo();
}

function finishPhase() {
  if (pomo.phase === "focus") {
    alertUser(`Focus done! Take a ${prefs.pomoBreak}-minute break.`);
    startPhase("break");
  } else {
    alertUser("Break's over. Back to focus!");
    startPhase("focus");
  }
}

pomoStartButton.addEventListener("click", () => {
  if (!pomo.active) {
    pomo.focusFields = null;
    startPhase("focus");
  } else if (pomo.paused) {
    pomo.paused = false;
    pomo.endsAt = Date.now() + pomo.remaining;
  } else {
    pomo.paused = true;
    pomo.remaining = pomo.endsAt - Date.now();
  }
  renderPomo();
});

pomoResetButton.addEventListener("click", () => {
  pomo.active = false;
  pomo.phase = "focus";
  pomo.focusFields = null;
  renderPomo();
});

for (const preset of pomoPresets) {
  preset.addEventListener("click", () => {
    prefs.pomoWork = Number(preset.dataset.work);
    prefs.pomoBreak = Number(preset.dataset.break);
    pomoWorkInput.value = prefs.pomoWork;
    pomoBreakInput.value = prefs.pomoBreak;
    savePrefs();
    renderPomo();
  });
}

for (const input of [pomoWorkInput, pomoBreakInput]) {
  input.addEventListener("change", renderPomo);
}

/* Automatic break alarm */

let alarmFiredFor = null;
let snoozeUntil = 0;
let breakToast = null;

function startAlarmBreak() {
  const workFields = currentFields();
  stopTimer();
  setTimerFields({ description: "Break", type: "break" });
  startTimer();

  const endsAt = Date.now() + prefs.breakLengthMin * 60000;
  breakToast = showToast("", [], { sticky: true });
  const message = breakToast.querySelector(".toast-message");
  const timer = setInterval(() => {
    const left = endsAt - Date.now();
    message.textContent = `On a break: ${formatCountdown(left)} left`;
    if (left <= 0) {
      clearInterval(timer);
      breakToast.remove();
      alertUser("Break's over! Ready to get back to work?", [
        { label: "Back to work", primary: true, run: () => continueEntry(workFields) },
      ], { sticky: true });
    }
  }, 1000);
}

function checkBreakAlarm(now) {
  if (!prefs.breakAlarm || !running || pomo.active || typeSelect.value === "break") return;
  if (alarmFiredFor === running.start || now < snoozeUntil) return;
  if (now - running.start < prefs.breakAfterMin * 60000) return;

  alarmFiredFor = running.start;
  alertUser(`You've been working for ${prefs.breakAfterMin} minutes. Time for a ${prefs.breakLengthMin}-minute break.`, [
    { label: "Start break", primary: true, run: startAlarmBreak },
    {
      label: "Snooze 15 min",
      run: () => {
        alarmFiredFor = null;
        snoozeUntil = Date.now() + 15 * 60000;
      },
    },
    { label: "Not now" },
  ], { sticky: true });
}

/* Reminders */

let lastTrackReminder = Date.now();
let longTimerWarnedFor = null;

function withinWorkHours(now) {
  const date = new Date(now);
  const weekday = date.getDay() >= 1 && date.getDay() <= 5;
  const time = timeKey(now);
  return weekday && time >= prefs.workStart && time < prefs.workEnd;
}

function checkReminders(now) {
  if (prefs.remindTrack && !running && withinWorkHours(now)
      && now - lastTrackReminder >= prefs.remindEveryMin * 60000) {
    lastTrackReminder = now;
    alertUser("You're not tracking anything right now.", [
      { label: "Start timer", primary: true, run: () => { showView("tracker"); startTimer(); } },
    ]);
  }

  if (running && longTimerWarnedFor !== running.start
      && now - running.start >= prefs.longTimerHours * 3600000) {
    longTimerWarnedFor = running.start;
    alertUser(`Your timer has been running for over ${prefs.longTimerHours} hours. Did you forget to stop it?`, [
      { label: "Stop timer", primary: true, run: stopTimer },
      { label: "Keep going" },
    ], { sticky: true });
  }
}

/* One heartbeat for everything */

setInterval(() => {
  const now = Date.now();
  if (pomo.active && !pomo.paused && pomo.endsAt <= now) {
    finishPhase();
  }
  if (pomo.active) renderPomo();
  checkBreakAlarm(now);
  checkReminders(now);
}, 1000);

pomoWorkInput.value = prefs.pomoWork;
pomoBreakInput.value = prefs.pomoBreak;
renderPomo();
