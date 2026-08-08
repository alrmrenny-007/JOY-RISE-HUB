const CACHE_NAME = "joyrise-shell-v2";

const SHELL_FILES = [
  "index.html",
  "login.html",
  "signup.html",
  "forgot-password.html",
  "update-password.html",
  "winners.html",
  "transactions.html",
  "buy-ticket.html",
  "my-tickets.html",
  "referrals.html",
  "profile.html",
  "help.html",
  "terms.html",
  "privacy-policy.html",
  "cookies.html",
  "admin.html",
  "offline.html",
  "style.css",
  "app.js",
  "auth.js",
  "manifest.json",
  "favicon.ico",
  "icons/favicon-32.png",
  "icons/favicon-16.png",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle our own same-origin GET requests — never intercept
  // Supabase API calls, which must always hit the network live.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  // Page navigations: network first, fall back to cache, then offline page
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match("offline.html"))
        )
    );
    return;
  }

  // Static assets: cache first, update cache in the background
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
