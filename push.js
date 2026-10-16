// Notifications that arrive even when Deskito is closed.
// When you're signed in and allow notifications, this browser gets a push address, and the
// upcoming reminders, alarms and automatic timer starts are sent to the send-push server
// function (see supabase/push.sql). Only their text and time are stored unlocked there.

const PUSH_PUBLIC_KEY = "BNwERnXymrD09Nb0a9_FkOH54tJLoF9Q6TE6XO0_dSZJH24FDLrQrtIYp4Wsx-76BWRGBCLpsTXbbH3gGEJK3pc";
const PUSH_DAYS_AHEAD = 14;

let pushDevice = null;
let pushedJobs = "";
let pushBusy = false;

function pushSupported() {
  return Boolean(cloud) && "serviceWorker" in navigator && "PushManager" in window
    && "Notification" in window && location.protocol === "https:";
}

function keyBytes(text) {
  const base = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base + "=".repeat((4 - (base.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

// Give this browser a push address and tell the account about it
async function registerPushDevice() {
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(PUSH_PUBLIC_KEY),
    });
  }
  const { endpoint, keys } = subscription.toJSON();
  const { error } = await cloud.from("deskito_push_devices").upsert({
    endpoint,
    user_id: account.id,
    p256dh: keys.p256dh,
    auth: keys.auth,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  pushDevice = endpoint;
}

async function forgetPushDevice() {
  if (!pushSupported() || !account) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await cloud.from("deskito_push_devices").delete().eq("endpoint", subscription.endpoint);
    await subscription.unsubscribe();
  } catch (problem) {
    console.warn("Deskito push:", problem);
  }
}

/* Which notifications are coming up */

function dayAfter(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function upcomingPushJobs(now) {
  const jobs = [];
  const add = (key, at, title, body, sticky = false) => {
    if (at > now + 30000) jobs.push({ job_key: key, send_at: new Date(at).toISOString(), title, body, sticky });
  };

  for (const plan of store.plans) {
    if (plan.done) continue;
    const sent = new Set(plan.remindersSent || []);
    for (const minutes of plan.reminders || []) {
      if (sent.has(minutes)) continue;
      add(`rem:${plan.id}:${minutes}`, plan.start - minutes * 60000, "Deskito", reminderText(plan, minutes));
    }
    if (plan.autoStart && !plan.autoStarted && !plan.allDay) {
      add(`auto:${plan.id}`, plan.start, "Deskito", t("{title} is starting. Open Deskito and the timer will start.", { title: plan.title }));
    }
  }

  for (const alarm of store.alarms) {
    if (!alarm.on) continue;
    for (let i = 0; i < PUSH_DAYS_AHEAD; i++) {
      const date = dayAfter(now, i);
      const day = dayKey(date.getTime());
      if (alarm.lastRung === day || !alarmToday(alarm, date)) continue;
      add(alarmTag(alarm, day), fromDateAndTime(day, alarm.time), alarmTitle(alarm.time), alarm.label || t("Alarm"), true);
    }
  }

  if (snoozed) add("snooze", snoozed.at, alarmTitle(snoozed.alarm.time), snoozed.alarm.label || t("Alarm"), true);
  return jobs.sort((a, b) => a.job_key.localeCompare(b.job_key));
}

// Send the list to the account when it has changed
async function syncPushJobs() {
  if (pushBusy || !pushSupported() || !account || Notification.permission !== "granted") return;
  // Only after this device has its latest data, so an empty new device can't wipe the list
  if (syncStatus !== "synced") return;
  pushBusy = true;
  try {
    if (!pushDevice) await registerPushDevice();
    const jobs = upcomingPushJobs(Date.now());
    const fingerprint = JSON.stringify(jobs);
    if (fingerprint === pushedJobs) return;

    const { data: existing, error } = await cloud.from("deskito_push_jobs").select("job_key").eq("user_id", account.id).eq("sent", false);
    if (error) throw error;
    const wanted = new Set(jobs.map((job) => job.job_key));
    const stale = existing.map((row) => row.job_key).filter((key) => !wanted.has(key));
    if (stale.length) {
      await cloud.from("deskito_push_jobs").delete().eq("user_id", account.id).eq("sent", false).in("job_key", stale);
    }
    if (jobs.length) {
      const rows = jobs.map((job) => ({ ...job, user_id: account.id, sent: false }));
      const { error: saveError } = await cloud.from("deskito_push_jobs").upsert(rows);
      if (saveError) throw saveError;
    }
    pushedJobs = fingerprint;
  } catch (problem) {
    console.warn("Deskito push:", problem);
  } finally {
    pushBusy = false;
  }
}

// Shown here while Deskito is open, so the server doesn't send it again
function markPushSent(key) {
  if (!pushSupported() || !account) return;
  cloud.from("deskito_push_jobs").update({ sent: true }).eq("user_id", account.id).eq("job_key", key)
    .then(({ error }) => error && console.warn("Deskito push:", error));
}

setInterval(syncPushJobs, 30000);
setTimeout(syncPushJobs, 5000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") syncPushJobs();
});
