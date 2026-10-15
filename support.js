// "Help from Deskito support": a user can choose to give support a copy of their data.
// The copy is locked with support's public key, so only the holder of the support key file
// can open it. The user can take it back at any time.

const supportSignedOut = document.getElementById("support-signed-out");
const supportSignedIn = document.getElementById("support-signed-in");
const supportStatus = document.getElementById("support-status");
const supportGive = document.getElementById("support-give");
const supportUpdate = document.getElementById("support-update");
const supportTakeBack = document.getElementById("support-take-back");

async function supportGrantDate() {
  const { data } = await cloud.from("deskito_data").select("value").eq("user_id", account.id).eq("key", "support").maybeSingle();
  return data?.value?.grantedAt || null;
}

async function showSupportSection() {
  supportSignedOut.hidden = Boolean(account);
  supportSignedIn.hidden = !account;
  if (!account || !cloud) return;
  const grantedAt = await supportGrantDate();
  supportStatus.textContent = grantedAt
    ? t("Support can see a copy of your data from {date}.", { date: new Date(grantedAt).toLocaleString(locale()) })
    : t("Support can't see any of your data.");
  supportGive.hidden = Boolean(grantedAt);
  supportUpdate.hidden = !grantedAt;
  supportTakeBack.hidden = !grantedAt;
}

async function giveSupportCopy() {
  // A one-off key pair: the copy can only be opened with support's private key
  const temporary = await newKeyPair();
  const lock = await sharedLock(temporary.privateKey, SUPPORT_PUBLIC_KEY);
  const copy = {
    email: account.email,
    madeAt: new Date().toISOString(),
    language: currentLanguage,
    data: Object.fromEntries(SYNC_KEYS.map((key) => [key, readLocal(key)])),
  };
  const { error } = await cloud.from("deskito_data").upsert(
    {
      user_id: account.id,
      key: "support",
      value: { locked: await lockJson(lock, copy), from: await publicKeyText(temporary), grantedAt: copy.madeAt },
      updated_at: copy.madeAt,
    },
    { onConflict: "user_id,key" }
  );
  if (error) throw error;
}

supportGive.addEventListener("click", async () => {
  if (!await askConfirm(t("Give Deskito support a copy of your data? They'll be able to read your entries, plans and projects until you take it back."), t("Give access"))) return;
  try {
    await giveSupportCopy();
    notify(t("Support can now see a copy of your data. You can take it back any time."));
  } catch (problem) {
    notify(t("Something went wrong: {message}", { message: problem.message }));
  }
  showSupportSection();
});

supportUpdate.addEventListener("click", async () => {
  await giveSupportCopy();
  notify(t("The support copy is up to date."));
  showSupportSection();
});

supportTakeBack.addEventListener("click", async () => {
  await cloud.from("deskito_data").delete().eq("user_id", account.id).eq("key", "support");
  notify(t("Support can no longer see your data."));
  showSupportSection();
});

document.querySelector('.nav-item[data-view="settings"]').addEventListener("click", showSupportSection);
supportSignedOut.hidden = false;
supportSignedIn.hidden = true;
