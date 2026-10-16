// Reminders before events, starting the timer automatically, alarms, and system
// notifications. These work while Deskito is open or running in the background; a web app
// can't wake itself up once it's fully closed.

/* System notifications (they show on top of other apps) */

// sticky: stays on screen until you click it. actions: buttons on the notification itself
async function systemNotify(title, body, { sticky = false, actions = [], tag = `${title}|${body}` } = {}) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const options = {
    body,
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag,
    renotify: true,
    requireInteraction: sticky,
    silent: false,
  };
  if (actions.length) options.actions = actions;
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      // Already sent by the server (push.js) while Deskito was in the background? Don't show it twice
      if (/^(rem|auto|alarm):/.test(tag) && (await registration.getNotifications({ tag })).length) return;
      await registration.showNotification(title, options);
      return;
    }
  } catch {
    // Fall back to a plain notification below
  }
  try {
    // Buttons only work through the service worker
    delete options.actions;
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Some phones only allow notifications through the service worker
  }
}

const notifyBanner = document.getElementById("notify-banner");

function wantsNotifications() {
  return store.plans.some((plan) => !plan.done && ((plan.reminders || []).length || plan.autoStart))
    || store.alarms.some((alarm) => alarm.on)
    || prefs.breakAlarm;
}

function showNotifyBanner() {
  let dismissed = false;
  try {
    dismissed = sessionStorage.getItem("notifyBannerDismissed") === "1";
  } catch {
    // Not important
  }
  notifyBanner.hidden = !("Notification" in window) || Notification.permission !== "default" || dismissed || !wantsNotifications();
}

document.getElementById("notify-allow").addEventListener("click", async () => {
  const answer = await Notification.requestPermission();
  notifyBanner.hidden = true;
  showToast(answer === "granted" ? t("Desktop notifications are on.") : t("Notifications were not allowed."));
});

document.getElementById("notify-later").addEventListener("click", () => {
  notifyBanner.hidden = true;
  try {
    sessionStorage.setItem("notifyBannerDismissed", "1");
  } catch {
    // Not important
  }
});

// A test you can try from another app
document.getElementById("test-notification").addEventListener("click", async () => {
  if (!("Notification" in window)) {
    showToast(t("This browser doesn't support desktop notifications."));
    return;
  }
  if (Notification.permission !== "granted" && await Notification.requestPermission() !== "granted") {
    showToast(t("Notifications were not allowed."));
    return;
  }
  showToast(t("Switch to another app now. The test arrives in 10 seconds."));
  setTimeout(() => {
    chime();
    systemNotify("Deskito", t("This is a test. Notifications work!"), { sticky: true, tag: "deskito-test" });
  }, 10000);
});

/* Reminders before events */

function minutesText(minutes) {
  if (minutes >= 60 && minutes % 60 === 0) return t("{hours}h", { hours: minutes / 60 });
  return minutes >= 60 ? formatHours(minutes * 60000) : t("{minutes}m", { minutes });
}

function reminderText(plan, minutesLeft) {
  let message = t("{title} starts in {time}.", { title: plan.title, time: minutesText(minutesLeft) });
  if (plan.autoStart && !plan.allDay) message += ` ${t("The timer will start automatically.")}`;
  return message;
}

function checkEventReminders(now) {
  let changed = false;
  for (const plan of store.plans) {
    if (plan.done || !(plan.reminders || []).length) continue;
    const sent = new Set(plan.remindersSent || []);
    const due = plan.reminders.filter((minutes) => !sent.has(minutes) && now >= plan.start - minutes * 60000);
    if (!due.length) continue;
    due.forEach((minutes) => {
      sent.add(minutes);
      if (typeof markPushSent === "function") markPushSent(`rem:${plan.id}:${minutes}`);
    });
    plan.remindersSent = [...sent];
    changed = true;
    // Several reminders due at once (e.g. Deskito was closed) give one message, and none after the start
    if (now >= plan.start) continue;
    const left = Math.max(1, Math.round((plan.start - now) / 60000));
    alertUser(reminderText(plan, left), [], { tag: `rem:${plan.id}:${Math.min(...due)}` });
  }
  if (changed) savePlans();
}

/* Starting the timer automatically */

const endNoticeShown = new Set();

function checkAutoStart(now) {
  for (const plan of store.plans) {
    if (!plan.autoStart || plan.autoStarted || plan.done || plan.allDay) continue;
    const until = plan.noEnd ? plan.start + 15 * 60000 : plan.end;
    if (now < plan.start || now >= until) continue;

    plan.autoStarted = true;
    savePlans();
    if (typeof markPushSent === "function") markPushSent(`auto:${plan.id}`);
    if (running?.planId === plan.id) continue;

    const wasRunning = Boolean(running);
    continueEntry({
      description: plan.title,
      type: plan.type === "meeting" ? "meeting" : "task",
      projectId: plan.projectId || "",
      taskId: plan.taskId || "",
      tagIds: [],
      planId: plan.id,
    });
    // Opened a bit late? Then count from the event's start
    if (!wasRunning) {
      running.start = plan.start;
      saveRunning();
    }
    alertUser(t("Timer started for {title}.", { title: plan.title }), [], { tag: `auto:${plan.id}` });
  }

  // The event has ended while its timer is still running
  const plan = running?.planId && store.plans.find((item) => item.id === running.planId);
  if (plan && plan.autoStart && !plan.noEnd && !plan.allDay && now >= plan.end && !endNoticeShown.has(plan.id)) {
    endNoticeShown.add(plan.id);
    alertUser(t("{title} has ended. Stop the timer?", { title: plan.title }), [
      { label: t("Stop timer"), primary: true, run: stopTimer },
      { label: t("Keep going") },
    ], { sticky: true });
  }
}

/* Alarms */

const alarmForm = document.getElementById("alarm-form");
const alarmTime = document.getElementById("alarm-time");
const alarmLabel = document.getElementById("alarm-label");
const alarmRepeat = document.getElementById("alarm-repeat");
const alarmList = document.getElementById("alarm-list");
const alarmDialog = document.getElementById("alarm-dialog");
const alarmRingTime = document.getElementById("alarm-ring-time");
const alarmRingLabel = document.getElementById("alarm-ring-label");

const REPEAT_LABELS = { once: "Once", daily: "Every day", weekdays: "Weekdays", weekends: "Weekends" };
let ringingSound = null;
let snoozed = null;

function alarmToday(alarm, date) {
  const day = date.getDay();
  if (alarm.repeat === "once") return alarm.date === dayKey(date.getTime());
  if (alarm.repeat === "weekdays") return day >= 1 && day <= 5;
  if (alarm.repeat === "weekends") return day === 0 || day === 6;
  return true;
}

function renderAlarms() {
  const sorted = [...store.alarms].sort((a, b) => a.time.localeCompare(b.time));
  alarmList.replaceChildren(
    ...sorted.map((alarm) =>
      el("li", { class: `alarm-row${alarm.on ? "" : " off"}` },
        el("label", { class: "alarm-switch", title: t("On") },
          el("input", {
            type: "checkbox",
            checked: alarm.on,
            onchange: (event) => {
              alarm.on = event.target.checked;
              if (alarm.on && alarm.repeat === "once") alarm.date = nextDateFor(alarm.time);
              saveAlarms();
              renderAlarms();
            },
          })
        ),
        el("span", { class: "alarm-time" }, formatTimeOfDay(fromDateAndTime("2000-01-01", alarm.time))),
        el("span", { class: "alarm-info" },
          el("span", {}, alarm.label || t("Alarm")),
          el("span", { class: "alarm-repeat" }, alarm.repeat === "once" && alarm.date ? dayLabel(alarm.date) : t(REPEAT_LABELS[alarm.repeat]))
        ),
        el("button", {
          type: "button",
          class: "icon-button",
          title: t("Delete alarm"),
          onclick: () => {
            store.alarms = store.alarms.filter((item) => item.id !== alarm.id);
            saveAlarms();
            renderAlarms();
          },
        }, "✕")
      )
    )
  );
}

// A "once" alarm rings today if that time is still to come, otherwise tomorrow
function nextDateFor(time) {
  const today = dayKey(Date.now());
  return fromDateAndTime(today, time) > Date.now() ? today : dayKey(Date.now() + 86400000);
}

alarmForm.addEventListener("submit", (event) => {
  event.preventDefault();
  store.alarms.push({
    id: uid(),
    time: alarmTime.value,
    label: alarmLabel.value.trim(),
    repeat: alarmRepeat.value,
    date: alarmRepeat.value === "once" ? nextDateFor(alarmTime.value) : "",
    on: true,
    lastRung: "",
  });
  saveAlarms();
  renderAlarms();
  alarmForm.reset();
  if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
});

// The same names are used by the server (push.js), so one alarm never pops up twice
function alarmTag(alarm, day) {
  return `alarm:${alarm.id}:${day}`;
}

function alarmTitle(time) {
  return `⏰ ${formatTimeOfDay(fromDateAndTime("2000-01-01", time))}`;
}

let ringingTag = "";

function ring(alarm, tag) {
  ringingTag = tag;
  if (typeof markPushSent === "function") markPushSent(tag);
  alarmRingTime.textContent = formatTimeOfDay(fromDateAndTime("2000-01-01", alarm.time));
  alarmRingLabel.textContent = alarm.label || t("Alarm");
  if (!alarmDialog.open) alarmDialog.showModal();
  systemNotify(alarmTitle(alarm.time), alarm.label || t("Alarm"), {
    sticky: true,
    tag,
    actions: [
      { action: "alarm-stop", title: t("STOP") },
      { action: "alarm-snooze", title: t("Snooze 5 min") },
    ],
  });
  clearInterval(ringingSound);
  chime();
  const stopAt = Date.now() + 3 * 60000;
  ringingSound = setInterval(() => {
    if (Date.now() > stopAt) {
      clearInterval(ringingSound);
      return;
    }
    chime();
  }, 2500);
}

function stopRinging() {
  clearInterval(ringingSound);
  alarmDialog.close();
}

function snoozeAlarm() {
  const alarm = { time: timeKey(Date.now() + 5 * 60000), label: alarmRingLabel.textContent };
  snoozed = { at: Date.now() + 5 * 60000, alarm };
  stopRinging();
}

async function closeAlarmNotification() {
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    for (const notification of await registration?.getNotifications({ tag: ringingTag }) || []) notification.close();
  } catch {
    // Nothing to close
  }
}

document.getElementById("alarm-stop").addEventListener("click", () => {
  stopRinging();
  closeAlarmNotification();
});
document.getElementById("alarm-snooze").addEventListener("click", () => {
  snoozeAlarm();
  closeAlarmNotification();
});

// The Stop / Snooze buttons on the system notification (e.g. clicked while in another app)
navigator.serviceWorker?.addEventListener("message", (event) => {
  if (event.data?.type !== "notification-action") return;
  if (event.data.action === "alarm-stop") stopRinging();
  if (event.data.action === "alarm-snooze") snoozeAlarm();
});

function checkAlarms(now) {
  const today = dayKey(now);
  for (const alarm of store.alarms) {
    if (!alarm.on || alarm.lastRung === today || !alarmToday(alarm, new Date(now))) continue;
    const at = fromDateAndTime(today, alarm.time);
    if (now < at || now > at + 10 * 60000) continue; // rings up to 10 minutes late, not hours later
    alarm.lastRung = today;
    if (alarm.repeat === "once") alarm.on = false;
    saveAlarms();
    renderAlarms();
    ring(alarm, alarmTag(alarm, today));
  }
  if (snoozed && now >= snoozed.at) {
    const { alarm } = snoozed;
    snoozed = null;
    ring(alarm, "snooze");
  }
}

/* One heartbeat for all of it */

function checkEverything() {
  const now = Date.now();
  checkEventReminders(now);
  checkAutoStart(now);
  checkAlarms(now);
  showNotifyBanner();
}

setInterval(checkEverything, 15000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") checkEverything();
});
renderAlarms();
setTimeout(checkEverything, 2000);
