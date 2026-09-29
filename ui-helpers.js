// ui-helpers.js — shared frontend utilities for Joy-Rise Hub
//
// 1. friendlyError()      — never leak raw Postgres/Supabase/Flutterwave
//                            error text to end users; map to safe copy.
// 2. checkRateLimit() /
//    recordFailedAttempt() — a client-side speed bump against scripted
//                            login/signup attempts from one browser.
// 3. renderCaptcha()       — optional Cloudflare Turnstile widget, wired
//                            up but inert until a site key is added.
//
// Include this AFTER auth.js and BEFORE your page's own inline <script>
// on any page with a user-facing form: <script src="ui-helpers.js"></script>

(function (window) {
  'use strict';

  // ============================================================
  // 1. FRIENDLY ERROR MESSAGES
  // ============================================================
  // Any raw error text that doesn't match a known, safe pattern below
  // falls back to a generic message — so a stray Postgres constraint
  // name, RPC signature, or gateway stack trace never reaches a user.
  const KNOWN_ERROR_PATTERNS = [
    { match: /invalid login credentials/i, message: 'Incorrect email or password. Please try again.' },
    { match: /email not confirmed/i, message: 'Please confirm your email address before logging in — check your inbox.' },
    { match: /user already registered|already been registered/i, message: 'An account with this email already exists. Try logging in instead.' },
    { match: /password should be at least|password is too short/i, message: 'Your password is too short. Use at least 6 characters.' },
    { match: /too many requests|rate limit/i, message: 'Too many attempts. Please wait a moment and try again.' },
    { match: /failed to fetch|networkerror|network request failed|load failed/i, message: 'Network problem — check your connection and try again.' },
    { match: /jwt|token is expired|session.*expired/i, message: 'Your session has expired. Please log in again.' },
    { match: /permission denied|not authorized|row-level security|admin access required/i, message: "You don't have permission to do that." },
    { match: /duplicate key|already exists/i, message: 'That already exists — please check and try again.' },
    { match: /insufficient|not enough (funds|balance)/i, message: 'Insufficient balance for this action.' },
    { match: /timeout|timed out/i, message: 'That took too long. Please try again.' },
    { match: /invalid.*phone/i, message: 'Please enter a valid phone number.' },
    { match: /invalid.*email/i, message: 'Please enter a valid email address.' },
  ];

  function friendlyError(err, fallback) {
    fallback = fallback || 'Something went wrong. Please try again, or contact support if it keeps happening.';
    const raw = (err && (err.message || err.error_description || err.msg)) || (typeof err === 'string' ? err : '');
    if (!raw) return fallback;

    for (let i = 0; i < KNOWN_ERROR_PATTERNS.length; i++) {
      if (KNOWN_ERROR_PATTERNS[i].match.test(raw)) return KNOWN_ERROR_PATTERNS[i].message;
    }

    // This codebase's own RPC functions deliberately raise custom,
    // already-human-readable exceptions (e.g. fn_require_admin's
    // 'Admin access required', or admin_reject_withdrawal's rejection
    // reason). Those should reach the user as written. Only text that
    // *looks* like raw backend/system internals gets swapped for the
    // generic fallback instead.
    if (looksLikeTechnicalError(raw)) return fallback;
    return raw;
  }

  const TECHNICAL_ERROR_PATTERNS = [
    /function .*\(.*\) is not unique/i,
    /relation ".*" does not exist/i,
    /column ".*" does not exist/i,
    /permission denied for (table|function|relation|schema)/i,
    /violates (foreign key|check|unique|not-null) constraint/i,
    /duplicate key value violates/i,
    /null value in column/i,
    /syntax error at or near/i,
    /^PGRST\d/i,
    /\bpg_[a-z_]+\b/i,
    /\b(22P02|23503|23505|42501|42883|P0001)\b/,
    /TypeError|ReferenceError|SyntaxError:/,
    /Unexpected token/i,
    /CORS|cross-origin request/i,
    /ERR_[A-Z_]+/,
    /at Object\.|at async |\.(js|ts):\d+:\d+/,
    /stack trace/i,
    /Internal Server Error|502|503|504/i,
  ];

  function looksLikeTechnicalError(text) {
    for (let i = 0; i < TECHNICAL_ERROR_PATTERNS.length; i++) {
      if (TECHNICAL_ERROR_PATTERNS[i].test(text)) return true;
    }
    return false;
  }

  // ============================================================
  // 2. CLIENT-SIDE ATTEMPT THROTTLING
  // ============================================================
  // NOTE: this is a soft deterrent only (a determined attacker can clear
  // localStorage or switch browsers). Pair it with Supabase Auth's own
  // per-IP rate limiting and the CAPTCHA below for real protection.
  const ATTEMPT_PREFIX = 'joyrise_attempts_';

  function getAttemptState(key) {
    try {
      const raw = localStorage.getItem(ATTEMPT_PREFIX + key);
      return raw ? JSON.parse(raw) : { count: 0, lockUntil: 0 };
    } catch (e) {
      return { count: 0, lockUntil: 0 };
    }
  }

  function setAttemptState(key, state) {
    try { localStorage.setItem(ATTEMPT_PREFIX + key, JSON.stringify(state)); } catch (e) {}
  }

  // Returns { blocked, secondsLeft }
  function checkRateLimit(key) {
    const state = getAttemptState(key);
    const now = Date.now();
    if (state.lockUntil && state.lockUntil > now) {
      return { blocked: true, secondsLeft: Math.ceil((state.lockUntil - now) / 1000) };
    }
    return { blocked: false, secondsLeft: 0 };
  }

  // Call after a failed attempt. Progressive backoff:
  // 5 fails -> 30s lock, 8 fails -> 2min, 12+ fails -> 10min.
  // Returns the lock duration in seconds (0 if not yet locked).
  function recordFailedAttempt(key) {
    const state = getAttemptState(key);
    state.count = (state.count || 0) + 1;
    let lockSeconds = 0;
    if (state.count >= 12) lockSeconds = 600;
    else if (state.count >= 8) lockSeconds = 120;
    else if (state.count >= 5) lockSeconds = 30;
    if (lockSeconds) state.lockUntil = Date.now() + lockSeconds * 1000;
    setAttemptState(key, state);
    return lockSeconds;
  }

  function clearAttempts(key) {
    try { localStorage.removeItem(ATTEMPT_PREFIX + key); } catch (e) {}
  }

  function formatLockMessage(secondsLeft) {
    if (secondsLeft >= 60) {
      const mins = Math.ceil(secondsLeft / 60);
      return `Too many attempts. Please try again in ${mins} minute${mins === 1 ? '' : 's'}.`;
    }
    return `Too many attempts. Please try again in ${secondsLeft}s.`;
  }

  // ============================================================
  // 3. CLOUDFLARE TURNSTILE (CAPTCHA)
  // ============================================================
  // To activate real bot protection:
  //   1. Create a free Turnstile widget at
  //      https://dash.cloudflare.com/?to=/:account/turnstile
  //   2. Paste the SITE key below.
  //   3. In Supabase Dashboard > Authentication > Attack Protection,
  //      enable "Captcha protection", choose Turnstile, and paste the
  //      matching SECRET key there.
  //   4. Supabase will then require a valid captchaToken on
  //      signInWithPassword / signUp / resetPasswordForEmail calls —
  //      which the pages already pass through when a token exists.
  // Left blank (default), every widget silently hides itself and pages
  // work exactly as before — nothing breaks pre-setup.
  const TURNSTILE_SITE_KEY = ''; // <-- put your Turnstile site key here

  let turnstileScriptPromise = null;
  function loadTurnstileScript() {
    if (turnstileScriptPromise) return turnstileScriptPromise;
    turnstileScriptPromise = new Promise((resolve, reject) => {
      if (window.turnstile) return resolve();
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Could not load captcha script'));
      document.head.appendChild(s);
    });
    return turnstileScriptPromise;
  }

  // Renders a Turnstile widget into #containerId. onToken(token|null) is
  // called once solved, on expiry, and immediately with null if no site
  // key is configured yet (so callers can treat "no captcha" the same as
  // "not required").
  function renderCaptcha(containerId, onToken) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!TURNSTILE_SITE_KEY) {
      container.style.display = 'none';
      onToken(null);
      return;
    }
    container.style.display = '';
    loadTurnstileScript().then(function () {
      window.turnstile.render('#' + containerId, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: onToken,
        'expired-callback': function () { onToken(null); },
        theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
      });
    }).catch(function () { onToken(null); });
  }

  function isCaptchaConfigured() {
    return !!TURNSTILE_SITE_KEY;
  }

  // ============================================================
  // 4. DEVICE FINGERPRINT (for daily check-in anti-abuse)
  // ============================================================
  // Produces a stable hash for "this browser on this device" without
  // storing anything — so clearing localStorage/cookies or signing into
  // a different account on the same phone still produces the same hash.
  // This is a deterrent, not a guarantee: a different browser, incognito
  // mode with fingerprint protection, or a fresh device will still get a
  // fresh hash. Combine with device_checkin_log (server-side) as the
  // actual enforcement.
  let fingerprintPromise = null;

  function getDeviceFingerprint() {
    if (fingerprintPromise) return fingerprintPromise;
    fingerprintPromise = (async () => {
      const parts = [
        navigator.userAgent || '',
        navigator.language || '',
        String(navigator.hardwareConcurrency || ''),
        String(screen.width) + 'x' + String(screen.height) + 'x' + String(screen.colorDepth),
        String(new Date().getTimezoneOffset()),
      ];

      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('JoyRiseHub-fingerprint-🎟️', 2, 2);
        parts.push(canvas.toDataURL());
      } catch (e) { /* canvas blocked — fall back to the other signals */ }

      const raw = parts.join('||');

      try {
        const enc = new TextEncoder().encode(raw);
        const hashBuffer = await crypto.subtle.digest('SHA-256', enc);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        // Very old browser without SubtleCrypto — weak fallback hash.
        let hash = 0;
        for (let i = 0; i < raw.length; i++) {
          hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
        }
        return 'fallback_' + Math.abs(hash).toString(16);
      }
    })();
    return fingerprintPromise;
  }

  window.JoyRiseUI = {
    friendlyError: friendlyError,
    checkRateLimit: checkRateLimit,
    recordFailedAttempt: recordFailedAttempt,
    clearAttempts: clearAttempts,
    formatLockMessage: formatLockMessage,
    renderCaptcha: renderCaptcha,
    isCaptchaConfigured: isCaptchaConfigured,
    getDeviceFingerprint: getDeviceFingerprint,
  };
})(window);
