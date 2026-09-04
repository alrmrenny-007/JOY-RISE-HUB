// Shared Supabase client setup — loaded on every page (index, login, signup)
// before app.js or inline page scripts run.
(function () {
  const SUPABASE_URL = "https://ijkcqsodtmmavnveflgj.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqa2Nxc29kdG1tYXZudmVmbGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3OTE5ODQsImV4cCI6MjEwMTM2Nzk4NH0.b-R-yhNk00Gfc3zNasa-yb08huMc5kTu0zXdMMXNByo";

  let client = null;

  window.getSupabaseClient = function () {
    if (client) return client;
    if (window.supabase && typeof window.supabase.createClient === "function") {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      return client;
    }
    console.error("Supabase JS library did not load — check the <script> tag order in this page.");
    return null;
  };

  // Register the service worker for PWA install + offline shell caching
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
    });
  }

  // Auto-add a show/hide toggle to every password field on the page —
  // works on login, signup, update-password, etc. with zero per-page setup.
  function setupPasswordToggles() {
    document.querySelectorAll('input[type="password"]').forEach((input) => {
      const wrapper = document.createElement("div");
      wrapper.className = "password-field-wrapper";
      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "password-toggle-btn";
      toggle.setAttribute("aria-label", "Show password");
      toggle.innerHTML = '<i class="fa-regular fa-eye"></i>';
      wrapper.appendChild(toggle);

      toggle.addEventListener("click", () => {
        const showing = input.type === "text";
        input.type = showing ? "password" : "text";
        toggle.innerHTML = showing ? '<i class="fa-regular fa-eye"></i>' : '<i class="fa-regular fa-eye-slash"></i>';
        toggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupPasswordToggles);
  } else {
    setupPasswordToggles();
  }

  // Cookie consent banner — shows once per browser, on every page
  function setupCookieBanner() {
    if (localStorage.getItem("joyrise_cookie_consent")) return;

    const navbar = document.querySelector(".bottom-navbar");
    const bottomOffset = navbar ? navbar.offsetHeight : 0;

    const banner = document.createElement("div");
    banner.className = "cookie-banner";
    banner.style.bottom = bottomOffset + "px";
    banner.innerHTML = `
      <p>We use essential browser storage to keep you logged in and remember a couple of preferences — no tracking or ad cookies. <a href="cookies.html">Learn more</a></p>
      <button type="button" id="cookie-accept-btn">Got it</button>
    `;
    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add("show"));

    document.getElementById("cookie-accept-btn").addEventListener("click", () => {
      localStorage.setItem("joyrise_cookie_consent", "accepted");
      banner.classList.remove("show");
      setTimeout(() => banner.remove(), 350);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupCookieBanner);
  } else {
    setupCookieBanner();
  }

  // ============================================================
  // DARK THEME — floating toggle injected on every page (works
  // everywhere with zero per-page markup), circular "eclipse wipe"
  // transition on toggle via the View Transitions API where
  // supported, instant silent switch as a fallback everywhere else.
  // ============================================================
  const THEME_KEY = "joyrise_theme";

  function getSavedTheme() {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    const toggleBtn = document.getElementById("theme-toggle-btn");
    if (toggleBtn) {
      toggleBtn.innerHTML = theme === "dark"
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>';
    }
  }

  // Apply immediately on script load (before the toggle button even
  // exists) so returning visitors see their saved theme ASAP.
  applyTheme(getSavedTheme());

  function toggleTheme(clickEvent) {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!document.startViewTransition || reduceMotion) {
      applyTheme(next);
      return;
    }

    const x = clickEvent ? clickEvent.clientX : window.innerWidth / 2;
    const y = clickEvent ? clickEvent.clientY : window.innerHeight / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => applyTheme(next));

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 650,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  }

  function injectThemeToggle() {
    if (document.getElementById("theme-toggle-btn")) return;

    const btn = document.createElement("button");
    btn.id = "theme-toggle-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", "Toggle dark mode");
    btn.className = "theme-toggle-fab";
    btn.innerHTML = getSavedTheme() === "dark"
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
    document.body.appendChild(btn);

    btn.addEventListener("click", (e) => toggleTheme(e));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectThemeToggle);
  } else {
    injectThemeToggle();
  }

  // ============================================================
  // PUSH NOTIFICATIONS — opt-in prompt + subscription
  // ============================================================
  const VAPID_PUBLIC_KEY = "BEyoNhoZ0IZ6mfSZm0PORSNSSfOsE6PZyLqbVyeZ0lbR1_7gaCjYJiF087f3tm0kv4Yo7x0sc_RXXOzzaS9cFTM";

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Registers (or re-registers) this browser's push subscription and
  // saves it against the logged-in user. Safe to call more than once
  // — getSubscription() returns the existing one if already subscribed.
  // Returns { success, error } instead of swallowing failures, so
  // anything calling this (the auto-banner, or a manual button) can
  // show the person what actually went wrong.
  async function subscribeToPush() {
    try {
      const client = window.getSupabaseClient();
      if (!client) return { success: false, error: "Supabase client not ready" };

      const { data: { user } } = await client.auth.getUser();
      if (!user) return { success: false, error: "Not logged in" };

      if (!("serviceWorker" in navigator)) {
        return { success: false, error: "Service workers not supported in this browser" };
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const subJson = subscription.toJSON();
      const { error: dbError } = await client.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth_key: subJson.keys.auth,
        },
        { onConflict: "endpoint" }
      );

      if (dbError) {
        console.warn("Saving push subscription failed:", dbError);
        return { success: false, error: "Couldn't save subscription: " + dbError.message };
      }

      return { success: true };
    } catch (err) {
      console.warn("Push subscription failed:", err);
      return { success: false, error: err.message || "Unknown error" };
    }
  }

  // Manual trigger — call this from any "Enable Notifications" button
  // anywhere in the app (e.g. inside the notification bell dropdown).
  // Handles every case: browser doesn't support push, permission
  // previously denied (browsers won't let JS re-prompt — the person
  // has to change it in their browser's own site settings), or a
  // genuine subscription/save failure. Always returns a result object
  // so the caller can show accurate feedback instead of guessing.
  window.enablePushNotifications = async function () {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return { success: false, error: "Push notifications aren't supported in this browser. On iPhone, you must add this app to your Home Screen first." };
    }

    if (Notification.permission === "denied") {
      return { success: false, error: "Notifications are blocked for this site. Enable them in your browser's site settings, then try again." };
    }

    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return { success: false, error: "Permission was not granted." };
      }
    }

    return subscribeToPush();
  };

  // Shows a one-time opt-in banner (same visual style as the cookie
  // banner) to logged-in users who haven't decided yet. Never nags
  // someone who already said no, and never auto-prompts without a
  // tap — browsers penalize permission requests that aren't tied to
  // a real user gesture.
  function setupNotificationPrompt() {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return; // not supported in this browser context (e.g. iOS Safari when not installed to home screen)
    }
    if (Notification.permission === "granted") {
      subscribeToPush();
      return;
    }
    if (Notification.permission === "denied") {
      return; // they already said no — don't ask again
    }
    if (localStorage.getItem("joyrise_notif_prompt_dismissed")) return;

    const navbar = document.querySelector(".bottom-navbar");
    const bottomOffset = navbar ? navbar.offsetHeight : 0;

    const banner = document.createElement("div");
    banner.className = "cookie-banner";
    banner.style.bottom = bottomOffset + "px";
    banner.innerHTML = `
      <p>Get notified the moment you win, when withdrawals are paid, and before each draw starts.</p>
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button type="button" id="notif-enable-btn">Enable</button>
        <button type="button" id="notif-dismiss-btn" style="background:transparent; color:#999;">Not now</button>
      </div>
    `;
    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add("show"));

    document.getElementById("notif-enable-btn").addEventListener("click", async () => {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await subscribeToPush();
      } else {
        localStorage.setItem("joyrise_notif_prompt_dismissed", "1");
      }
      banner.classList.remove("show");
      setTimeout(() => banner.remove(), 350);
    });

    document.getElementById("notif-dismiss-btn").addEventListener("click", () => {
      localStorage.setItem("joyrise_notif_prompt_dismissed", "1");
      banner.classList.remove("show");
      setTimeout(() => banner.remove(), 350);
    });
  }

  // Only show this to logged-in users, and after a short delay so it
  // doesn't visually compete with the cookie banner on first load.
  async function initNotificationPrompt() {
    const client = window.getSupabaseClient();
    if (!client) return;
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    setTimeout(setupNotificationPrompt, 4000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNotificationPrompt);
  } else {
    initNotificationPrompt();
  }
})();
