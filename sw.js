// Keeps a copy of Deskito's files so the app opens without internet.
// Online, it always asks the website for the newest files first (so updates never mix
// old and new files); the saved copy is only used when there's no connection.

const CACHE = "deskito-v5";
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
  "data.js",
  "app.js",
  "projects.js",
  "welcome.js",
  "nav.js",
  "settings.js",
  "pomodoro.js",
  "calendar.js",
  "reports.js",
  "icons.js",
  "sync.js",
  "sharing.js",
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
