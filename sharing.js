// Sharing your calendar with people you choose. They send nothing back automatically and
// can never change your plans: the rules in supabase/sharing.sql only let them read.

const sharingSignedOut = document.getElementById("sharing-signed-out");
const sharingSignedIn = document.getElementById("sharing-signed-in");
const shareForm = document.getElementById("share-form");
const shareEmail = document.getElementById("share-email");
const shareLists = document.getElementById("share-lists");
const calSharedRow = document.getElementById("cal-shared-row");
const calShowShared = document.getElementById("cal-show-shared");

let shares = [];
let sharedCalendars = []; // [{ ownerId, name, plans }]
let lastSharingRefresh = 0;

/* Plans from calendars shared with you, for the calendar views */

function sharedPlansOn(key) {
  if (!calShowShared.checked) return [];
  const from = dayStart(key);
  const to = addDays(from, 1);
  return sharedCalendars.flatMap((calendar) =>
    calendar.plans
      .filter((plan) => plan.start < to && plan.end > from)
      .map((plan) => ({ ...plan, id: `${calendar.ownerId}:${plan.id}`, shared: true, ownerName: calendar.name }))
  );
}

function showSharedPlan(plan) {
  const time = planTimeLabel(plan);
  showToast(t("Added by {name}", { name: plan.ownerName }) + ` · ${plan.title} · ${time}` + (plan.notes ? ` · ${plan.notes}` : ""));
}

calShowShared.addEventListener("change", () => {
  renderCalendar();
  renderMini();
});

/* Loading */

async function refreshSharing(force = false) {
  showSharingSection();
  if (!account || !cloud || !navigator.onLine) return;
  if (!force && Date.now() - lastSharingRefresh < 20000) return;
  lastSharingRefresh = Date.now();

  const { data, error } = await cloud.from("deskito_shares").select("*").order("created_at");
  if (error) {
    console.warn("Deskito sharing:", error);
    return;
  }
  shares = data;
  renderShares();
  announceRequests();
  await loadSharedCalendars();
  await publishSharedCalendars();
}

// Each shared calendar is a separate locked copy (row "share:<id>") that only the two
// people involved can open: their key pairs make the same lock on both sides
async function loadSharedCalendars() {
  const accepted = shares.filter((share) => share.viewer_id === account.id && share.status === "accepted" && share.owner_public_key);
  sharedCalendars = [];
  if (accepted.length > 0 && myKeyPair) {
    const { data, error } = await cloud
      .from("deskito_data")
      .select("user_id, key, value")
      .in("key", accepted.map((share) => `share:${share.id}`));
    if (error) {
      console.warn("Deskito sharing:", error);
      return;
    }
    for (const share of accepted) {
      const row = data.find((item) => item.key === `share:${share.id}`);
      let calendar = { name: share.owner_email, plans: [] };
      if (row?.value?.locked) {
        try {
          calendar = await unlockJson(await sharedLock(myKeyPair.privateKey, share.owner_public_key), row.value.locked);
        } catch (problem) {
          console.warn("Deskito sharing: can't open a shared calendar", problem);
        }
      }
      sharedCalendars.push({ ownerId: share.owner_id, name: displayName(share.owner_email, calendar.name || share.owner_email), realName: calendar.name || share.owner_email, plans: calendar.plans || [] });
    }
  }
  calSharedRow.hidden = sharedCalendars.length === 0;
  renderCalendar();
  renderMini();
}

// Put an up-to-date locked copy of your plans out for each person you share with
const lastPublished = {};

async function publishSharedCalendars() {
  if (!account || !cloud || !myKeyPair || !navigator.onLine) return;
  const mine = shares.filter((share) => share.owner_id === account.id && share.status === "accepted" && share.viewer_public_key);
  const name = readLocal("profile")?.name || account.email;
  const plans = store.plans.map(({ id, title, type, otherLabel, start, end, notes, color, done, allDay, noEnd }) => ({ id, title, type, otherLabel, start, end, notes, color, done, allDay, noEnd }));
  const payload = JSON.stringify({ name, plans });

  for (const share of mine) {
    if (lastPublished[share.id] === payload) continue;
    const lock = await sharedLock(myKeyPair.privateKey, share.viewer_public_key);
    const { error } = await cloud.from("deskito_data").upsert(
      { user_id: account.id, key: `share:${share.id}`, value: { locked: await lockJson(lock, { name, plans }) }, updated_at: new Date().toISOString() },
      { onConflict: "user_id,key" }
    );
    if (!error) lastPublished[share.id] = payload;
  }

  // Remove copies for people you no longer share with
  const { data } = await cloud.from("deskito_data").select("key").eq("user_id", account.id).like("key", "share:%");
  const keep = new Set(mine.map((share) => `share:${share.id}`));
  const stale = (data || []).map((row) => row.key).filter((key) => !keep.has(key));
  if (stale.length) await cloud.from("deskito_data").delete().eq("user_id", account.id).in("key", stale);
}

/* The Sharing section in Settings */

function showSharingSection() {
  sharingSignedOut.hidden = Boolean(account);
  sharingSignedIn.hidden = !account;
}

// Nicknames you give people (only you see them); they replace names in your calendar
function nicknames() {
  return readStore("nicknames", {});
}

function displayName(email, fallback) {
  return nicknames()[email.toLowerCase()] || fallback || email;
}

function setNickname(email, nickname) {
  const all = nicknames();
  if (nickname) {
    all[email.toLowerCase()] = nickname;
  } else {
    delete all[email.toLowerCase()];
  }
  writeStore("nicknames", all);
  for (const calendar of sharedCalendars) {
    const share = shares.find((item) => item.owner_id === calendar.ownerId);
    if (share) calendar.name = displayName(share.owner_email, calendar.realName);
  }
  renderCalendar();
  renderMini();
}

function shareRow(email, status, ...buttons) {
  return el("div", { class: "share-row" },
    el("span", { class: "share-email" }, email),
    el("input", {
      type: "text",
      class: "text-input small nickname-input",
      placeholder: t("Nickname"),
      title: t("A nickname only you see"),
      value: nicknames()[email.toLowerCase()] || "",
      onchange: (event) => setNickname(email, event.target.value.trim()),
    }),
    status && el("span", { class: `badge ${status === "accepted" ? "accepted" : ""}` }, status === "accepted" ? t("Accepted") : t("Waiting")),
    el("span", { class: "share-buttons" }, buttons)
  );
}

function smallButton(label, run, danger = false) {
  return el("button", { type: "button", class: `secondary-button small${danger ? " danger" : ""}`, onclick: run }, label);
}

function renderShares() {
  const mine = shares.filter((share) => share.owner_id === account.id);
  const withMe = shares.filter((share) => share.owner_id !== account.id);
  const nobody = () => el("p", { class: "mini-empty" }, t("Nobody yet."));

  shareLists.replaceChildren(
    el("p", { class: "field-label" }, t("You share your calendar with")),
    ...(mine.length ? mine.map((share) =>
      shareRow(share.viewer_email, share.status,
        smallButton(t("Stop sharing"), () => stopSharing(share), true))
    ) : [nobody()]),
    el("p", { class: "field-label" }, t("Shared with you")),
    ...(withMe.length ? withMe.map((share) =>
      share.status === "pending"
        ? shareRow(share.owner_email, "",
            smallButton(t("Accept"), () => acceptShare(share)),
            smallButton(t("Decline"), () => removeShare(share), true))
        : shareRow(share.owner_email, "accepted",
            smallButton(t("Remove"), () => removeShare(share, true), true))
    ) : [nobody()])
  );
}

shareForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = shareEmail.value.trim().toLowerCase();
  if (email === account.email.toLowerCase()) {
    notify(t("You can't share with yourself."));
    return;
  }
  if (!myKeyPair) {
    notify(t("Locked – unlock your data to sync it"));
    return;
  }
  const { error } = await cloud.from("deskito_shares").insert({ owner_email: account.email, viewer_email: email, owner_public_key: myKeyPair.publicKeyText });
  if (error) {
    notify(error.code === "23505" ? t("You already sent a request to this person.") : t("Something went wrong: {message}", { message: error.message }));
    return;
  }
  shareForm.reset();
  notify(t("Request sent. {email} will see it the next time they open Deskito.", { email }));
  refreshSharing(true);
});

async function acceptShare(share) {
  if (!myKeyPair) {
    notify(t("Locked – unlock your data to sync it"));
    return;
  }
  const { error } = await cloud.from("deskito_shares").update({ status: "accepted", viewer_id: account.id, viewer_public_key: myKeyPair.publicKeyText }).eq("id", share.id);
  if (error) {
    notify(t("Something went wrong: {message}", { message: error.message }));
    return;
  }
  await refreshSharing(true);
  const calendar = sharedCalendars.find((item) => item.ownerId === share.owner_id);
  notify(t("You can now see {name}'s calendar.", { name: calendar?.name || share.owner_email }));
}

async function removeShare(share, ask = false) {
  if (ask && !await askConfirm(t("Remove {email}'s calendar from your view?", { email: share.owner_email }), t("Remove"))) return;
  await cloud.from("deskito_shares").delete().eq("id", share.id);
  refreshSharing(true);
}

async function stopSharing(share) {
  if (!await askConfirm(t("Stop sharing your calendar with {email}?", { email: share.viewer_email }), t("Stop sharing"))) return;
  await cloud.from("deskito_data").delete().eq("user_id", account.id).eq("key", `share:${share.id}`);
  await cloud.from("deskito_shares").delete().eq("id", share.id);
  refreshSharing(true);
}

// A new request pops up once per visit until it's accepted or declined
function announceRequests() {
  let seen = [];
  try {
    seen = JSON.parse(sessionStorage.getItem("seenShareRequests")) || [];
  } catch {
    // Nothing seen yet
  }
  for (const share of shares) {
    if (share.owner_id === account.id || share.status !== "pending" || seen.includes(share.id)) continue;
    seen.push(share.id);
    showToast(t("{email} wants to share their calendar with you.", { email: share.owner_email }), [
      { label: t("Accept"), primary: true, run: () => acceptShare(share) },
      { label: t("Decline"), run: () => removeShare(share) },
    ], { sticky: true });
  }
  try {
    sessionStorage.setItem("seenShareRequests", JSON.stringify(seen));
  } catch {
    // Not important
  }
}

/* Keep it fresh */

document.addEventListener("synced", async () => {
  await refreshSharing();
  publishSharedCalendars();
});
document.querySelector('.nav-item[data-view="calendar"]').addEventListener("click", () => refreshSharing());
document.querySelector('.nav-item[data-view="settings"]').addEventListener("click", () => refreshSharing(true));
showSharingSection();
