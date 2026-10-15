// Each account's "vault": a secret key that locks the user's data before it's synced.
// The key itself is stored on the server only in locked form: once locked with the user's
// password, and once with their recovery key. Nobody else (not even Deskito) can open it.

// Deskito support's public key: it can only lock copies FOR support (the private half is a
// file kept by the owner of Deskito, outside this project)
const SUPPORT_PUBLIC_KEY = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEF3mwQEHMBTNLFBvTh7C1Y3gy63kPBKdRt0VoL0F05dEizt4s1HR7e/5hhI6YP0MvKzDpJHDU/hyT5k71VqCf2Q==";

const VAULT_ITERATIONS = 310000;
const DEVICE_KEY = "deskitoDeviceKey";
const DEVICE_VAULT = "deskitoVault";

let dataKey = null;
let myKeyPair = null;
let vaultRecord = null;
let pendingPassword = null; // the password just typed to log in, used once to unlock

/* Keeping the unlocked key on this device (so you don't type your password every time) */

async function loadDeviceKey() {
  const raw = localStorage.getItem(DEVICE_KEY);
  const saved = readStore(DEVICE_VAULT, null);
  if (!raw || !saved || saved.userId !== account.id) return false;
  try {
    dataKey = await dataKeyFromBytes(fromBase64(raw));
    await useVaultRecord(saved.record);
    return true;
  } catch {
    dataKey = null;
    return false;
  }
}

async function useVaultRecord(record) {
  vaultRecord = record;
  const privateBytes = await unlockBytes(dataKey, record.privateKey);
  myKeyPair = { privateKey: await privateKeyFromBytes(privateBytes), publicKeyText: record.publicKey };
}

async function rememberOnDevice() {
  originalSetItem.call(localStorage, DEVICE_KEY, toBase64(await dataKeyBytes(dataKey)));
  originalSetItem.call(localStorage, DEVICE_VAULT, JSON.stringify({ userId: account.id, record: vaultRecord }));
}

function forgetDevice() {
  originalRemoveItem.call(localStorage, DEVICE_KEY);
  originalRemoveItem.call(localStorage, DEVICE_VAULT);
  dataKey = null;
  myKeyPair = null;
  vaultRecord = null;
}

/* The vault on the server */

async function fetchVault() {
  const { data, error } = await cloud.from("deskito_data").select("value").eq("user_id", account.id).eq("key", "vault").maybeSingle();
  if (error) throw error;
  return data?.value || null;
}

async function saveVault(record) {
  const { error } = await cloud.from("deskito_data").upsert(
    { user_id: account.id, key: "vault", value: record, updated_at: new Date().toISOString() },
    { onConflict: "user_id,key" }
  );
  if (error) throw error;
  vaultRecord = record;
  await rememberOnDevice();
}

async function lockKeyWith(secret) {
  const salt = randomBytes(16);
  const locked = await lockBytes(await keyFromSecret(secret, salt, VAULT_ITERATIONS), await dataKeyBytes(dataKey));
  return { salt: toBase64(salt), locked };
}

async function createVault(password) {
  dataKey = await newDataKey();
  const pair = await newKeyPair();
  const recoveryKey = newRecoveryKey();
  const byPassword = await lockKeyWith(password);
  const byRecovery = await lockKeyWith(cleanRecoveryKey(recoveryKey));
  const record = {
    v: 1,
    iterations: VAULT_ITERATIONS,
    salt: byPassword.salt,
    byPassword: byPassword.locked,
    recoverySalt: byRecovery.salt,
    byRecovery: byRecovery.locked,
    publicKey: await publicKeyText(pair),
    privateKey: await lockBytes(dataKey, await privateKeyBytes(pair)),
  };
  await saveVault(record);
  myKeyPair = { privateKey: pair.privateKey, publicKeyText: record.publicKey };
  return recoveryKey;
}

async function unlockWithPassword(record, password) {
  const key = await keyFromSecret(password, fromBase64(record.salt), record.iterations);
  dataKey = await dataKeyFromBytes(await unlockBytes(key, record.byPassword));
  await useVaultRecord(record);
  await rememberOnDevice();
}

async function unlockWithRecovery(record, recoveryKey) {
  const key = await keyFromSecret(cleanRecoveryKey(recoveryKey), fromBase64(record.recoverySalt), record.iterations);
  dataKey = await dataKeyFromBytes(await unlockBytes(key, record.byRecovery));
  await useVaultRecord(record);
}

// After a password change, lock the key again with the new password
async function relockWithPassword(password) {
  const byPassword = await lockKeyWith(password);
  await saveVault({ ...vaultRecord, salt: byPassword.salt, byPassword: byPassword.locked });
}

async function passwordIsCorrect(password) {
  const { error } = await cloud.auth.signInWithPassword({ email: account.email, password });
  return !error;
}

// Called when an account is in use: true when the data can be locked and unlocked
async function ensureUnlocked() {
  if (dataKey) return true;
  if (await loadDeviceKey()) return true;

  const record = await fetchVault();
  if (pendingPassword) {
    const password = pendingPassword;
    pendingPassword = null;
    if (!record) {
      showRecoveryKey(await createVault(password));
      return true;
    }
    try {
      await unlockWithPassword(record, password);
      return true;
    } catch {
      // The password changed since the vault was made: the recovery key is needed
    }
  }
  openVault(record ? "unlock" : "create", record);
  return false;
}

/* The vault window */

const vaultDialog = document.getElementById("vault-dialog");
const vaultForm = document.getElementById("vault-form");
const vaultTitle = document.getElementById("vault-title");
const vaultText = document.getElementById("vault-text");
const vaultRecoveryRow = document.getElementById("vault-recovery-row");
const vaultRecoveryInput = document.getElementById("vault-recovery");
const vaultPasswordRow = document.getElementById("vault-password-row");
const vaultPasswordInput = document.getElementById("vault-password");
const vaultShowRow = document.getElementById("vault-show-row");
const vaultShowKey = document.getElementById("vault-show-key");
const vaultSavedCheck = document.getElementById("vault-saved");
const vaultMessage = document.getElementById("vault-message");
const vaultLinkA = document.getElementById("vault-link-a");
const vaultLinkB = document.getElementById("vault-link-b");
const vaultSubmit = document.getElementById("vault-submit");
const vaultCancel = document.getElementById("vault-cancel");
let vaultMode = "unlock";
let vaultTarget = null;

const VAULT_MODES = {
  create: {
    title: "Protect your data",
    text: "Deskito locks your data on your device before syncing it, so nobody else can read it – not even Deskito. Enter your account password to create your lock.",
    password: true,
    submit: "CONTINUE",
  },
  unlock: {
    title: "Unlock your data",
    text: "Enter your account password to unlock your data on this device.",
    password: true,
    submit: "UNLOCK",
    linkA: ["Use my recovery key instead", "recovery"],
  },
  recovery: {
    title: "Use your recovery key",
    text: "Enter the recovery key you saved, and your current account password.",
    recovery: true,
    password: true,
    submit: "UNLOCK",
    linkA: ["Use my password instead", "unlock"],
    linkB: ["I lost my recovery key", "startOver"],
  },
  startOver: {
    title: "Start over?",
    text: "Without your old password or recovery key, nobody can unlock your synced data. You can start over: the locked data in your account will be deleted, and what's on this device will be synced again under a new lock.",
    password: true,
    submit: "START OVER",
    danger: true,
    linkA: ["Back", "recovery"],
  },
  show: {
    title: "Save your recovery key",
    text: "If you ever forget your password, this key is the only way to unlock your data. Keep it somewhere safe, like a password manager or on paper. Nobody can recover it for you.",
    show: true,
    submit: "DONE",
    noCancel: true,
  },
};

function openVault(mode, record = vaultTarget) {
  vaultMode = mode;
  vaultTarget = record;
  const settings = VAULT_MODES[mode];
  vaultTitle.textContent = t(settings.title);
  vaultText.textContent = t(settings.text);
  vaultRecoveryRow.hidden = !settings.recovery;
  vaultRecoveryInput.required = Boolean(settings.recovery);
  vaultPasswordRow.hidden = !settings.password;
  vaultPasswordInput.required = Boolean(settings.password);
  vaultPasswordInput.value = "";
  vaultRecoveryInput.value = "";
  vaultShowRow.hidden = !settings.show;
  vaultSavedCheck.checked = false;
  vaultSavedCheck.required = Boolean(settings.show);
  vaultSubmit.textContent = t(settings.submit);
  vaultSubmit.classList.toggle("danger-button", Boolean(settings.danger));
  vaultCancel.hidden = Boolean(settings.noCancel);
  for (const [link, value] of [[vaultLinkA, settings.linkA], [vaultLinkB, settings.linkB]]) {
    link.hidden = !value;
    if (value) {
      link.textContent = t(value[0]);
      link.dataset.mode = value[1];
    }
  }
  vaultMessage.hidden = true;
  if (!vaultDialog.open) vaultDialog.showModal();
}

function showRecoveryKey(recoveryKey) {
  vaultShowKey.textContent = recoveryKey;
  openVault("show");
}

function vaultError(text) {
  vaultMessage.textContent = text;
  vaultMessage.hidden = false;
}

for (const link of [vaultLinkA, vaultLinkB]) {
  link.addEventListener("click", () => openVault(link.dataset.mode));
}

vaultCancel.addEventListener("click", () => vaultDialog.close());
vaultDialog.addEventListener("cancel", (event) => {
  if (vaultMode === "show") event.preventDefault();
});

document.getElementById("vault-copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(vaultShowKey.textContent);
    notify(t("Copied."));
  } catch {
    notify(t("Select the key and copy it by hand."));
  }
});

document.getElementById("vault-download").addEventListener("click", () => {
  const text = `${t("Deskito recovery key")}\n${account.email}\n\n${vaultShowKey.textContent}\n`;
  downloadFile("deskito-recovery-key.txt", text, "text/plain;charset=utf-8");
});

vaultForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  vaultSubmit.disabled = true;
  const password = vaultPasswordInput.value;
  try {
    if (vaultMode === "create") {
      if (!await passwordIsCorrect(password)) return vaultError(t("Wrong password."));
      const existing = await fetchVault();
      if (existing) {
        await unlockWithPassword(existing, password);
        vaultDialog.close();
      } else {
        showRecoveryKey(await createVault(password));
      }
    } else if (vaultMode === "unlock") {
      try {
        await unlockWithPassword(vaultTarget, password);
      } catch {
        return vaultError(t("That password doesn't unlock your data. If you changed your password, use your recovery key."));
      }
      vaultDialog.close();
    } else if (vaultMode === "recovery") {
      try {
        await unlockWithRecovery(vaultTarget, vaultRecoveryInput.value);
      } catch {
        return vaultError(t("That recovery key doesn't fit."));
      }
      if (!await passwordIsCorrect(password)) {
        dataKey = null;
        return vaultError(t("Wrong password."));
      }
      await relockWithPassword(password);
      vaultDialog.close();
      notify(t("Unlocked. Your data is locked with your new password from now on."));
    } else if (vaultMode === "startOver") {
      if (!await passwordIsCorrect(password)) return vaultError(t("Wrong password."));
      await cloud.from("deskito_data").delete().eq("user_id", account.id);
      markEverythingForUpload();
      showRecoveryKey(await createVault(password));
    } else if (vaultMode === "show") {
      vaultDialog.close();
    }
    syncNow();
  } catch (problem) {
    vaultError(t("Something went wrong: {message}", { message: problem.message }));
  } finally {
    vaultSubmit.disabled = false;
  }
});
