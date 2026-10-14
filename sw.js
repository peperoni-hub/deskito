// Keeps a copy of Deskito's files so the app opens without internet.
// It shows the saved copy straight away and quietly fetches updates for next time.

const CACHE = "deskito-v1";
const FILES = [
  "./",
  "index.html",
  "styles.css",
  "theme.js",
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
  "icon.svg",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
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
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const saved = await cache.match(event.request, { ignoreSearch: true });
      const fresh = fetch(event.request)
        .then((response) => {
          if (response.ok || response.type === "opaque") {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => saved);
      return saved || fresh;
    })
  );
});
