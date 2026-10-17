// Keeps a copy of Deskito's files so the app opens without internet.
// Online, it always asks the website for the newest files first (so updates never mix
// old and new files); the saved copy is only used when there's no connection.

const CACHE = "deskito-v15";
const FILES = [
  "./",
  "index.html",
  "styles.css",
  "theme.js",
  "i18n.js",
  "lang/bs.js",
  "lang/hr.js",
  "lang/sr.js",
  "lang/tr.js",
  "lang/de.js",
  "lang/fr.js",
  "lang/it.js",
  "lang/zh.js",
  "lang/ja.js",
  "lang/ko.js",
  "lang/ar.js",
  "lang/accounts.js",
  "lang/sharing.js",
  "lang/privacy.js",
  "lang/events.js",
  "lang/reminders.js",
  "lang/notifications.js",
  "data.js",
  "app.js",
  "projects.js",
  "welcome.js",
  "nav.js",
  "settings.js",
  "pomodoro.js",
  "calendar.js",
  "events.js",
  "reminders.js",
  "away.js",
  "reports.js",
  "icons.js",
  "crypto.js",
  "vault.js",
  "sync.js",
  "sharing.js",
  "support.js",
  "push.js",
  "privacy.html",
  "vendor/supabase.js",
  "icon.svg",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  // "reload" skips the browser's short-term store, so we never save an outdated copy
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: "reload" }))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Account data always comes straight from Supabase, never from the offline copy
  if (new URL(event.request.url).hostname.endsWith("supabase.co")) return;
  event.respondWith(
    // "no-cache" = always check with the website whether the file changed
    fetch(event.request, { cache: "no-cache" })
      .then((response) => {
        if (response.ok || response.type === "opaque") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});

// A notification sent by the server (see push.js), also when Deskito is closed
self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = { body: event.data ? event.data.text() : "" };
  }
  const tag = message.tag || "deskito";
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // You're looking at Deskito right now: it shows this itself
    if (windows.some((client) => client.focused && client.visibilityState === "visible")) return;
    // Deskito is open in the background and already showed it
    if ((await self.registration.getNotifications({ tag })).length) return;
    await self.registration.showNotification(message.title || "Deskito", {
      body: message.body || "",
      tag,
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      renotify: true,
      requireInteraction: Boolean(message.sticky),
    });
  })());
});

// Clicking a notification opens Deskito (or brings it to the front).
// Clicking one of its buttons (like Stop or Snooze on an alarm) tells Deskito without leaving your app.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const scope = self.registration.scope;
      const open = windows.find((client) => client.url.startsWith(scope)) || windows[0];
      if (event.action) {
        for (const client of windows) client.postMessage({ type: "notification-action", action: event.action });
        return;
      }
      return open ? open.focus() : self.clients.openWindow("./");
    })
  );
});
