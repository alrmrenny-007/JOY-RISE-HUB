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
})();
