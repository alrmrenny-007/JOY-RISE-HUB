const CACHE_NAME = "joyrise-shell-v5";

const SHELL_FILES = [
  "index.html",
  "login.html",
  "signup.html",
  "forgot-password.html",
  "update-password.html",
  "winners.html",
  "live-draw.html",
  "confirm-email.html",
  "transactions.html",
  "buy-ticket.html",
  "my-tickets.html",
  "referrals.html",
  "profile.html",
  "bank-details.html",
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

// ============================================================
// PUSH NOTIFICATIONS
// ============================================================

// Fired when a push message arrives from the server (via the edge
// function we build in a later phase). The payload is whatever JSON
// that function sends — title/body/url are the only fields we expect.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = { title: "Joy-Rise Hub", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Joy-Rise Hub";
  const options = {
    body: payload.body || "",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    data: { url: payload.url || "index.html" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Fired when the user taps the notification itself. Focuses an
// already-open tab if one matches, otherwise opens a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : "index.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
