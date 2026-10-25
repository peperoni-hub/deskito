// Accounts and syncing between devices, with Supabase.
// Deskito keeps working from the browser's own storage (so it works offline); when you're
// signed in, every change is also sent to your account, and changes made on your other
// devices are brought in.

// The publishable key is meant to be public: the security rules in supabase/schema.sql
// make sure every user can only reach their own data
const SUPABASE_URL = "https://udhmreajsncijlxzpvkm.supabase.co";
const SUPABASE_KEY = "sb_publishable_44nWOAwDYF5lxoXGDsAVuQ_x6SwGU4C";

const SYNC_KEYS = ["entries", "projects", "tags", "plans", "deleted", "prefs", "profile", "theme", "appearance", "language", "running", "paused", "alarms", "nicknames", "notes"];
const TEXT_KEYS = ["theme", "appearance", "language"];

const cloud = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let account = null;
let syncStatus = "off";
let syncRunning = null;
let syncAgain = false;
let pushTimer = null;
let applyingRemote = false;
let recoveringPassword = false;

/* Reading and writing this browser's copy */

const originalSetItem = Storage.prototype.setItem;
const originalRemoveItem = Storage.prototype.removeItem;

function readLocal(key) {
  const raw = localStorage.getItem(key);
  if (raw == null || TEXT_KEYS.includes(key)) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeLocal(key, value) {
  applyingRemote = true;
  if (value == null) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, TEXT_KEYS.includes(key) ? value : JSON.stringify(value));
  }
  applyingRemote = false;
}

function syncMeta() {
  const meta = readStore("syncMeta", {});
  return { userId: null, dirty: {}, changedAt: {}, ...meta };
}

function saveSyncMeta(meta) {
  originalSetItem.call(localStorage, "syncMeta", JSON.stringify(meta));
}

// Notice every change Deskito saves, so it can be sent to the account
Storage.prototype.setItem = function (key, value) {
  originalSetItem.call(this, key, value);
  if (this === localStorage) noteLocalChange(key);
};

Storage.prototype.removeItem = function (key) {
  originalRemoveItem.call(this, key);
  if (this === localStorage) noteLocalChange(key);
};

function noteLocalChange(key) {
  if (applyingRemote || !SYNC_KEYS.includes(key) || !account) return;
  const meta = syncMeta();
  meta.dirty[key] = true;
  meta.changedAt[key] = Date.now();
  saveSyncMeta(meta);
  clearTimeout(pushTimer);
  pushTimer = setTimeout(syncNow, 1500);
}

/* Merging */

// Lists (entries, projects...) are merged item by item; the newest version of each item wins
function mergeLists(local, remote, deletedIds) {
  const byId = new Map();
  for (const item of [...remote, ...local]) {
    const known = byId.get(item.id);
    if (!known || (item.updatedAt || 0) >= (known.updatedAt || 0)) byId.set(item.id, item);
  }
  return [...byId.values()].filter((item) => !deletedIds.has(item.id));
}

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

async function pull() {
  // Only your own rows (calendars shared with you are read separately, in sharing.js)
  const { data, error } = await cloud.from("deskito_data").select("key, value, updated_at").eq("user_id", account.id);
  if (error) throw error;

  const meta = syncMeta();
  const changed = new Set();

  // Unlock what came from the server. Anything stored before locking existed is
  // read as it is, and locked on the next upload.
  const remote = {};
  const notLockedYet = [];
  for (const row of data) {
    if (!SYNC_KEYS.includes(row.key)) continue;
    if (typeof row.value?.locked === "string") {
      remote[row.key] = { ...row, value: await unlockJson(dataKey, row.value.locked) };
    } else {
      remote[row.key] = row;
      notLockedYet.push(row.key);
    }
  }

  // Deleted items: everything deleted on any device stays deleted
  const localDeleted = readLocal("deleted") || {};
  const remoteDeleted = remote.deleted?.value || {};
  const deleted = {};
  for (const key of LIST_KEYS) {
    deleted[key] = [...new Set([...(localDeleted[key] || []), ...(remoteDeleted[key] || [])])];
  }
  if (!same(deleted, localDeleted)) {
    writeLocal("deleted", deleted);
    changed.add("deleted");
  }
  if (!same(deleted, remoteDeleted)) meta.dirty.deleted = true;

  for (const key of SYNC_KEYS) {
    if (key === "deleted") continue;
    const row = remote[key];

    if (LIST_KEYS.includes(key)) {
      const local = readLocal(key) || [];
      const merged = mergeLists(local, row?.value || [], new Set(deleted[key]));
      if (!same(merged, local)) {
        writeLocal(key, merged);
        changed.add(key);
      }
      if (!row || !same(merged, row.value)) meta.dirty[key] = true;
      continue;
    }

    // Settings and the running timer: the most recent change wins
    if (!row) {
      if (readLocal(key) != null) meta.dirty[key] = true;
      continue;
    }
    const localIsNewer = meta.dirty[key] && (meta.changedAt[key] || 0) > Date.parse(row.updated_at);
    if (localIsNewer) continue;
    if (!same(readLocal(key), row.value)) {
      writeLocal(key, row.value);
      changed.add(key);
    }
    delete meta.dirty[key];
  }

  for (const key of notLockedYet) meta.dirty[key] = true;
  saveSyncMeta(meta);
  showRemoteChanges(changed);
}

async function push() {
  const meta = syncMeta();
  const keys = Object.keys(meta.dirty).filter((key) => meta.dirty[key]);
  if (keys.length === 0) return;

  const now = new Date().toISOString();
  // Everything is locked on this device before it leaves
  const rows = await Promise.all(keys.map(async (key) => ({
    user_id: account.id,
    key,
    value: { locked: await lockJson(dataKey, readLocal(key)) },
    updated_at: now,
  })));
  const { error } = await cloud.from("deskito_data").upsert(rows, { onConflict: "user_id,key" });
  if (error) throw error;

  // Anything changed while we were sending stays marked, for the next round
  const after = syncMeta();
  for (const key of keys) {
    if ((after.changedAt[key] || 0) <= Date.parse(now)) delete after.dirty[key];
  }
  saveSyncMeta(after);
}

async function syncNow() {
  if (!account || !cloud) return;
  if (!navigator.onLine) {
    setSyncStatus("offline");
    return;
  }
  // Nothing is sent or read until this device has the unlocked key
  if (!dataKey) {
    setSyncStatus("locked");
    return;
  }
  if (syncRunning) {
    syncAgain = true;
    return syncRunning;
  }
  setSyncStatus("syncing");
  syncRunning = (async () => {
    try {
      await pull();
      await push();
      setSyncStatus("synced");
      document.dispatchEvent(new Event("synced"));
    } catch (problem) {
      console.warn("Deskito sync:", problem);
      setSyncStatus(navigator.onLine ? "error" : "offline");
    } finally {
      syncRunning = null;
      if (syncAgain) {
        syncAgain = false;
        syncNow();
      }
    }
  })();
  return syncRunning;
}

/* Showing changes that came from another device */

function showRemoteChanges(changed) {
  if (changed.size === 0) return;

  if (changed.has("language") && readLocal("language") !== currentLanguage) {
    location.reload();
    return;
  }

  let listsChanged = false;
  for (const key of LIST_KEYS) {
    if (changed.has(key)) {
      store[key] = readLocal(key) || [];
      listsChanged = true;
    }
  }
  if (listsChanged) {
    renderEntries();
    renderProjects();
    refreshPickers();
    renderCalendar();
    renderMini();
    renderEvents();
    if (typeof renderAlarms === "function") renderAlarms();
    if (typeof renderNotes === "function") renderNotes();
  }

  if (changed.has("prefs")) {
    Object.assign(prefs, readLocal("prefs"));
    for (const input of document.querySelectorAll("[data-pref]")) {
      if (input.type === "checkbox") input.checked = prefs[input.dataset.pref];
      else input.value = prefs[input.dataset.pref];
    }
  }

  if (changed.has("profile")) {
    const profile = readLocal("profile");
    if (profile) {
      showUserName(profile);
      welcome.hidden = true;
    }
  }

  if (changed.has("theme") && readLocal("theme")) applyTheme(readLocal("theme"), { animate: true });
  if (changed.has("appearance")) {
    applyAppearance(readLocal("appearance") || "system", { animate: true });
    markAppearance();
  }
  if (changed.has("running")) showRemoteTimer(readLocal("running"));
  if (changed.has("paused") || changed.has("running")) showRemotePause(readLocal("paused"));
}

// The timer was paused, continued or stopped on another device
function showRemotePause(remote) {
  if (running) return;
  pausedTimer = remote;
  if (pausedTimer) {
    setTimerFields(pausedTimer);
    showPausedState();
  } else if (startStopButton.classList.contains("paused")) {
    applyingRemote = true;
    resetTimer();
    applyingRemote = false;
  }
}

// The timer was started or stopped on another device
function showRemoteTimer(remote) {
  if (remote && (!running || running.start !== remote.start)) {
    cancelAnimationFrame(frameRequest);
    running = remote;
    setTimerFields(remote);
    showRunningState();
  } else if (!remote && running) {
    applyingRemote = true;
    resetTimer();
    applyingRemote = false;
  }
}

/* Signing in and out */

const SIGNED_IN_BEFORE = "deskitoSignedIn";

async function useAccount(user) {
  let meta = syncMeta();

  // Someone else's data is on this device: clear it before loading this account
  if (meta.userId && meta.userId !== user.id) {
    clearSyncedData();
    meta = syncMeta();
    meta.userId = user.id;
    saveSyncMeta(meta);
    location.reload();
    return;
  }

  // First time on this device with this account: add what's already here to the account.
  // Settings already in the account win; lists are merged.
  if (meta.userId !== user.id) {
    meta.userId = user.id;
    for (const key of SYNC_KEYS) {
      if (localStorage.getItem(key) != null) {
        meta.dirty[key] = true;
        meta.changedAt[key] = 0;
      }
    }
    saveSyncMeta(meta);
  }

  account = { id: user.id, email: user.email };
  originalSetItem.call(localStorage, SIGNED_IN_BEFORE, "1");
  showAccount();
  if (recoveringPassword) {
    setSyncStatus("locked");
    return;
  }
  try {
    if (await ensureUnlocked()) {
      await syncNow();
    } else {
      setSyncStatus("locked");
    }
  } catch (problem) {
    console.warn("Deskito vault:", problem);
    setSyncStatus(navigator.onLine ? "error" : "offline");
  }
}

// After starting over with a new lock: send everything on this device again
function markEverythingForUpload() {
  const meta = syncMeta();
  for (const key of SYNC_KEYS) {
    if (localStorage.getItem(key) != null) {
      meta.dirty[key] = true;
      meta.changedAt[key] = Date.now();
    }
  }
  saveSyncMeta(meta);
}

function clearSyncedData() {
  applyingRemote = true;
  for (const key of SYNC_KEYS) localStorage.removeItem(key);
  originalRemoveItem.call(localStorage, "syncMeta");
  applyingRemote = false;
  forgetDevice();
}

async function logOut() {
  if (!await askConfirm(t("Log out? Your data stays safe in your account and is removed from this device."), t("Log out"))) return;
  await syncNow();
  // Stop sending this account's notifications to this browser
  if (typeof forgetPushDevice === "function") await forgetPushDevice();
  await cloud.auth.signOut();
  clearSyncedData();
  originalRemoveItem.call(localStorage, SIGNED_IN_BEFORE);
  location.reload();
}

/* Status and the Account section in Settings */

const syncBadge = document.getElementById("sync-badge");
const accountSignedOut = document.getElementById("account-signed-out");
const accountSignedIn = document.getElementById("account-signed-in");
const accountEmail = document.getElementById("account-email");
const accountStatus = document.getElementById("account-status");

const STATUS_TEXT = {
  off: "Not signed in",
  syncing: "Syncing…",
  synced: "Synced",
  offline: "Offline – changes will sync when you're back online",
  error: "Sync problem – we'll keep trying",
  locked: "Locked – unlock your data to sync it",
};
const STATUS_ICON = { off: "", syncing: "⟳", synced: "☁", offline: "⚠", error: "⚠", locked: "🔒" };

function setSyncStatus(status) {
  syncStatus = status;
  syncBadge.textContent = STATUS_ICON[status];
  syncBadge.title = t(STATUS_TEXT[status]);
  syncBadge.dataset.status = status;
  accountStatus.textContent = t(STATUS_TEXT[status]);
}

function showAccount() {
  accountSignedOut.hidden = Boolean(account);
  accountSignedIn.hidden = !account;
  if (account) accountEmail.textContent = t("Signed in as {email}", { email: account.email });
  setSyncStatus(account ? syncStatus : "off");
}

document.getElementById("account-sync").addEventListener("click", async () => {
  if (!dataKey && account) {
    await ensureUnlocked();
  }
  syncNow();
});
document.getElementById("account-logout").addEventListener("click", logOut);
document.getElementById("account-signup").addEventListener("click", () => openAuth("signup"));
document.getElementById("account-login").addEventListener("click", () => openAuth("login"));
document.getElementById("welcome-login").addEventListener("click", () => openAuth("login"));

/* The sign-in window */

const authDialog = document.getElementById("auth-dialog");
const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const authIntro = document.getElementById("auth-intro");
const authEmailRow = document.getElementById("auth-email-row");
const authEmail = document.getElementById("auth-email");
const authPasswordRow = document.getElementById("auth-password-row");
const authPassword = document.getElementById("auth-password");
const authMessage = document.getElementById("auth-message");
const authSwitch = document.getElementById("auth-switch");
const authForgot = document.getElementById("auth-forgot");
const authSubmit = document.getElementById("auth-submit");
let authMode = "login";

const AUTH_MODES = {
  login: { title: "Log in", submit: "LOG IN", email: true, password: true, switchTo: "signup", switchText: "No account yet? Create one", forgot: true },
  signup: { title: "Create account", intro: "Your entries, projects and plans will be saved to your account and synced to all your devices.", submit: "CREATE ACCOUNT", email: true, password: true, switchTo: "login", switchText: "Already have an account? Log in" },
  reset: { title: "Reset your password", submit: "SEND LINK", email: true, switchTo: "login", switchText: "Back to log in" },
  newPassword: { title: "Set a new password", submit: "SAVE PASSWORD", password: true },
};

function openAuth(mode) {
  if (!cloud) {
    notify(t("Sync isn't available right now (no connection to the server)."));
    return;
  }
  authMode = mode;
  const settings = AUTH_MODES[mode];
  authTitle.textContent = t(settings.title);
  authIntro.textContent = settings.intro ? t(settings.intro) : "";
  authIntro.hidden = !settings.intro;
  authEmailRow.hidden = !settings.email;
  authEmail.required = Boolean(settings.email);
  authPasswordRow.hidden = !settings.password;
  authPassword.required = Boolean(settings.password);
  authPassword.autocomplete = mode === "login" ? "current-password" : "new-password";
  authSubmit.textContent = t(settings.submit);
  authSwitch.hidden = !settings.switchTo;
  authSwitch.textContent = settings.switchText ? t(settings.switchText) : "";
  authForgot.hidden = !settings.forgot;
  authMessage.hidden = true;
  authPassword.value = "";
  if (!authDialog.open) authDialog.showModal();
}

function showAuthMessage(text, isError = false) {
  authMessage.textContent = text;
  authMessage.classList.toggle("error", isError);
  authMessage.hidden = false;
}

authSwitch.addEventListener("click", () => openAuth(AUTH_MODES[authMode].switchTo));
authForgot.addEventListener("click", () => openAuth("reset"));
document.getElementById("auth-cancel").addEventListener("click", () => authDialog.close());

const SITE_URL = "https://peperoni-hub.github.io/deskito/";

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authSubmit.disabled = true;
  const email = authEmail.value.trim();
  const password = authPassword.value;
  try {
    if (authMode === "login") {
      pendingPassword = password; // used once to unlock your data
      const { error } = await cloud.auth.signInWithPassword({ email, password });
      if (error) throw error;
      authDialog.close();
      notify(t("Logged in. Your data is syncing."));
    } else if (authMode === "signup") {
      const { data, error } = await cloud.auth.signUp({ email, password, options: { emailRedirectTo: SITE_URL } });
      if (error) throw error;
      if (data.session) {
        authDialog.close();
        notify(t("Logged in. Your data is syncing."));
      } else {
        showAuthMessage(t("We sent you an email. Click the link in it to confirm your account, then log in."));
      }
    } else if (authMode === "reset") {
      const { error } = await cloud.auth.resetPasswordForEmail(email, { redirectTo: SITE_URL });
      if (error) throw error;
      showAuthMessage(t("Check your email for a link to reset your password."));
    } else if (authMode === "newPassword") {
      const { error } = await cloud.auth.updateUser({ password });
      if (error) throw error;
      authDialog.close();
      notify(t("Your password has been changed."));
      // Lock your data key with the new password too (or ask for the recovery key)
      recoveringPassword = false;
      if (dataKey) {
        await relockWithPassword(password);
      } else if (account) {
        pendingPassword = password;
        if (await ensureUnlocked()) syncNow();
      }
    }
  } catch (problem) {
    const wrongLogin = /invalid login credentials/i.test(problem.message || "");
    showAuthMessage(wrongLogin ? t("Wrong email or password.") : t("Something went wrong: {message}", { message: problem.message }), true);
  } finally {
    authSubmit.disabled = false;
  }
});

/* Start up */

if (cloud) {
  cloud.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      // Choose the new password first; the lock is sorted out right after
      recoveringPassword = true;
      setTimeout(() => openAuth("newPassword"), 0);
    }
    if (session?.user && (!account || account.id !== session.user.id)) {
      // Leave the sign-in code a moment before talking to the database
      setTimeout(() => useAccount(session.user), 0);
    }
  });

  window.addEventListener("online", syncNow);
  window.addEventListener("offline", () => account && setSyncStatus("offline"));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncNow();
  });
  setInterval(syncNow, 60000);
}

showAccount();

// After the welcome screen, suggest an account (once)
document.getElementById("welcome-form").addEventListener("submit", () => {
  if (account || !cloud) return;
  setTimeout(() => {
    showToast(t("Create a free account to use Deskito on all your devices."), [
      { label: t("Create account"), primary: true, run: () => openAuth("signup") },
    ]);
  }, 2500);
});
