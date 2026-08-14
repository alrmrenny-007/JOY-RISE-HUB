// Wrapped in an IIFE so this file can be safely re-executed by
// live-preview/hot-reload tools without "already been declared" errors.
(function () {

// Supabase client comes from auth.js (loaded before this file)
let supabaseClient = null;
if (window.getSupabaseClient) {
  supabaseClient = window.getSupabaseClient();
}

document.addEventListener("DOMContentLoaded", async () => {

  let currentUserId = null;

  // DOM Elements
  const winningsDisplay = document.getElementById("val-winnings");
  const referralDisplay = document.getElementById("val-referral");
  const userDisplayName = document.querySelector(".user-greeting h1");
  const userAvatarImg = document.getElementById("user-avatar");
  
  // Navigation & Action Buttons
  const navItems = document.querySelectorAll(".bottom-navbar .nav-item");
  const fabDeposit = document.getElementById("fab-deposit");
  const btnDeposit = document.getElementById("btn-deposit");
  const btnWithdraw = document.getElementById("btn-withdraw");

  // Modal Elements
  const modalOverlay = document.getElementById("wallet-modal-overlay");
  const modalIconCircle = document.getElementById("modal-icon-circle");
  const modalIcon = document.getElementById("modal-icon");
  const modalTitle = document.getElementById("modal-title");
  const modalSubtitle = document.getElementById("modal-subtitle");
  const modalAmountInput = document.getElementById("modal-amount-input");
  const modalBalanceHint = document.getElementById("modal-balance-hint");
  const modalError = document.getElementById("modal-error");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const modalCancelBtn = document.getElementById("modal-cancel-btn");
  const modalConfirmBtn = document.getElementById("modal-confirm-btn");
  const modalConfirmLabel = document.getElementById("modal-confirm-label");
  const quickAmounts = document.getElementById("quick-amounts");
  const chipButtons = document.querySelectorAll(".chip-amount");

  // Toast Elements
  const toast = document.getElementById("toast");
  const toastIcon = document.getElementById("toast-icon");
  const toastMessage = document.getElementById("toast-message");

  let modalMode = null; // 'deposit' | 'withdraw' | 'referral-withdraw'
  let toastTimer = null;

  // Activity Grid Elements
  const totalRefsEl = document.querySelector(".act-purple strong");
  const activeRefsEl = document.querySelector(".act-mint strong");
  const ticketsTodayEl = document.querySelector(".act-amber strong");
  const totalWinningsEl = document.querySelector(".act-blue strong");

  // Referral wallet card elements
  const referralUnlockBtn = document.getElementById("btn-referral-unlock");
  const referralWithdrawBtn = document.getElementById("btn-referral-withdraw");
  const referralLockIcon = document.getElementById("referral-lock-icon");
  const referralProgressFill = document.getElementById("referral-progress-fill");
  const referralProgressTooltip = document.getElementById("referral-progress-tooltip");
  const referralProgressLabel = document.getElementById("referral-progress-label");
  const referralProgressTarget = document.getElementById("referral-progress-target");
  const referralRemainingText = document.getElementById("referral-remaining-text");

  // Quick Actions
  const qaBuyTicket = document.getElementById("qa-buy-ticket");
  const qaReferrals = document.getElementById("qa-referrals");
  const qaWinners = document.getElementById("qa-winners");
  const qaTxns = document.getElementById("qa-txns");

  const fmt = (n) => Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

  let hasLoadedOnce = false;

  function parseDisplayed(el) {
    if (!el) return 0;
    return parseFloat((el.textContent || '0').replace(/,/g, '')) || 0;
  }

  function animateNumber(el, from, to, duration = 700) {
    if (!el) return;
    // Skip the animation if the value didn't actually change, or if the
    // browser prefers reduced motion
    if (from === to || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = fmt(to);
      return;
    }
    const start = performance.now();
    const diff = to - from;
    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      el.textContent = fmt(from + diff * eased);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = fmt(to);
    }
    requestAnimationFrame(step);
  }

  let ticketPrice = 100;
  let referralThreshold = 3000;
  let referralBalance = 0;
  let winningsBalance = 0;
  let myReferralCode = null;
  let hasBankDetails = false;
  let hasQualifyingDeposit = false;
  let minWithdrawalAmount = 1000;
  let minFirstDeposit = 500;

  // --- 1. LOAD CONFIG (ticket price, referral unlock threshold) ---
  async function loadConfig() {
    if (!supabaseClient) return;
    const { data, error } = await supabaseClient.from('app_config').select('key, value');
    if (error || !data) return;
    data.forEach(row => {
      if (row.key === 'ticket_price') ticketPrice = Number(row.value);
      if (row.key === 'referral_unlock_threshold') referralThreshold = Number(row.value);
      if (row.key === 'min_withdrawal_amount') minWithdrawalAmount = Number(row.value);
      if (row.key === 'min_first_deposit_to_unlock_withdrawal') minFirstDeposit = Number(row.value);
    });
  }

  // --- 2. FETCH USER PROFILE & WALLET DATA ---
  async function loadUserData() {
    if (!supabaseClient) {
      showToast("Backend unavailable. Check your connection.", "error");
      hideAppLoadingOverlay();
      return;
    }
    try {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

      if (authError || !user) {
        window.location.href = 'login.html';
        return;
      }

      currentUserId = user.id;

      const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select(`
          full_name,
          avatar_url,
          referral_code,
          winnings_balance,
          referral_balance,
          total_referrals,
          active_referrals,
          total_winnings,
          account_number
        `)
        .eq('id', currentUserId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error.message);
        showToast("Couldn't load your wallet data. Pull to refresh.", "error");
        hideAppLoadingOverlay();
        return;
      }

      // Tickets bought today — computed live, not a stale stored counter
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const { count: ticketsToday } = await supabaseClient
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', currentUserId)
        .gte('purchased_at', startOfToday.toISOString());

      if (profile) {
        winningsBalance = Number(profile.winnings_balance || 0);
        referralBalance = Number(profile.referral_balance || 0);
        myReferralCode = profile.referral_code || null;
        hasBankDetails = !!profile.account_number;

        const { count: qualifyingDepositCount } = await supabaseClient
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', currentUserId)
          .eq('type', 'deposit')
          .eq('status', 'completed')
          .gte('amount', minFirstDeposit);
        hasQualifyingDeposit = (qualifyingDepositCount || 0) > 0;

        if (userDisplayName && profile.full_name) {
          userDisplayName.innerHTML = `${profile.full_name} <span class="wave">👋</span>`;
        }

        if (userAvatarImg && profile.avatar_url) {
          userAvatarImg.src = profile.avatar_url;
        }

        if (winningsDisplay) {
          if (hasLoadedOnce) animateNumber(winningsDisplay, parseDisplayed(winningsDisplay), winningsBalance);
          else winningsDisplay.textContent = fmt(winningsBalance);
        }
        if (referralDisplay) {
          if (hasLoadedOnce) animateNumber(referralDisplay, parseDisplayed(referralDisplay), referralBalance);
          else referralDisplay.textContent = fmt(referralBalance);
        }

        if (totalRefsEl) totalRefsEl.textContent = profile.total_referrals || 0;
        if (activeRefsEl) activeRefsEl.textContent = profile.active_referrals || 0;
        if (ticketsTodayEl) ticketsTodayEl.textContent = ticketsToday || 0;
        if (totalWinningsEl) totalWinningsEl.textContent = profile.total_winnings || 0;

        updateReferralProgressUI();
      }

      hasLoadedOnce = true;
      hideAppLoadingOverlay();
      checkForCelebration();

    } catch (err) {
      console.error("Error loading data:", err);
      showToast("Something went wrong loading your data.", "error");
      hideAppLoadingOverlay();
    }
  }

  function hideAppLoadingOverlay() {
    const overlay = document.getElementById("app-loading-overlay");
    if (overlay) {
      overlay.classList.add("fade-out");
      setTimeout(() => overlay.remove(), 350);
    }
  }

  // --- 3. REFERRAL WALLET UNLOCK UI ---
  let referralWasUnlocked = false;

  function updateReferralProgressUI() {
    const pct = Math.min(100, Math.round((referralBalance / referralThreshold) * 100));
    const unlocked = referralBalance >= referralThreshold;

    if (referralProgressFill) referralProgressFill.style.width = pct + "%";
    if (referralProgressTooltip) referralProgressTooltip.textContent = `₦${fmt(referralBalance)}`;
    if (referralProgressLabel) referralProgressLabel.textContent = `₦${fmt(referralBalance)} (${pct}%)`;
    if (referralProgressTarget) referralProgressTarget.textContent = `₦${fmt(referralThreshold)}`;

    // Celebrate the exact moment it crosses the threshold — not on
    // every re-render, and not if it was already unlocked on page load
    if (unlocked && !referralWasUnlocked && hasLoadedOnce) {
      const card = document.querySelector(".referral-progress-card");
      if (card) {
        card.classList.add("referral-just-unlocked");
        setTimeout(() => card.classList.remove("referral-just-unlocked"), 2200);
      }
    }
    referralWasUnlocked = unlocked;

    if (unlocked) {
      if (referralLockIcon) referralLockIcon.style.display = "none";
      if (referralUnlockBtn) {
        referralUnlockBtn.textContent = "Withdraw Referral Bonus";
        referralUnlockBtn.disabled = false;
      }
      if (referralWithdrawBtn) {
        referralWithdrawBtn.disabled = false;
        referralWithdrawBtn.innerHTML = `<i class="fa-solid fa-circle-arrow-down"></i> WITHDRAW`;
      }
      if (referralRemainingText) referralRemainingText.textContent = "Your referral bonus is unlocked!";
    } else {
      const remaining = referralThreshold - referralBalance;
      if (referralLockIcon) referralLockIcon.style.display = "inline";
      if (referralUnlockBtn) {
        referralUnlockBtn.textContent = `Unlock at ₦${fmt(referralThreshold)}`;
        referralUnlockBtn.disabled = true;
      }
      if (referralWithdrawBtn) {
        referralWithdrawBtn.disabled = true;
        referralWithdrawBtn.innerHTML = `<i class="fa-solid fa-lock"></i> WITHDRAW`;
      }
      if (referralRemainingText) referralRemainingText.textContent = `You need ₦${fmt(remaining)} more to unlock your bonus`;
    }
  }

  // --- 2. TOAST HELPER ---
  function showToast(message, type = "success") {
    clearTimeout(toastTimer);
    toastMessage.textContent = message;
    toast.classList.remove("error");
    toastIcon.className = "fa-solid toast-icon " + (type === "error" ? "fa-circle-exclamation" : "fa-circle-check");
    if (type === "error") toast.classList.add("error");
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
  }

  // --- 3. MODAL HELPERS ---
  function openModal(mode) {
    if (mode === "withdraw" || mode === "referral-withdraw") {
      if (!hasBankDetails) {
        showToast("Add your bank details first so we know where to send your withdrawal.", "error");
        setTimeout(() => { window.location.href = 'bank-details.html'; }, 1200);
        return;
      }
      if (!hasQualifyingDeposit) {
        showToast(`Please make a one-time deposit of at least ₦${fmt(minFirstDeposit)} to activate bank withdrawals on your account.`, "error");
        return;
      }
      const relevantBalance = mode === "withdraw" ? winningsBalance : referralBalance;
      if (relevantBalance < minWithdrawalAmount) {
        showToast(`Minimum withdrawal amount is ₦${fmt(minWithdrawalAmount)}`, "error");
        return;
      }
    }

    modalMode = mode;
    modalAmountInput.value = "";
    modalError.textContent = "";
    chipButtons.forEach(c => c.classList.remove("selected"));

    if (mode === "deposit") {
      modalIconCircle.classList.remove("withdraw-mode");
      modalIcon.className = "fa-solid fa-circle-plus";
      modalTitle.textContent = "Deposit Funds";
      modalSubtitle.textContent = "Add money to your Main Wallet";
      modalConfirmLabel.textContent = "Deposit";
      modalBalanceHint.textContent = "";
    } else if (mode === "withdraw") {
      modalIconCircle.classList.add("withdraw-mode");
      modalIcon.className = "fa-solid fa-circle-arrow-down";
      modalTitle.textContent = "Withdraw Funds";
      modalSubtitle.textContent = "Move money out of your Main Wallet";
      modalConfirmLabel.textContent = "Withdraw";
      modalBalanceHint.textContent = `Available: ₦${fmt(winningsBalance)}`;
    } else {
      modalIconCircle.classList.add("withdraw-mode");
      modalIcon.className = "fa-solid fa-circle-arrow-down";
      modalTitle.textContent = "Withdraw Referral Bonus";
      modalSubtitle.textContent = "Move money out of your Referral Wallet";
      modalConfirmLabel.textContent = "Withdraw";
      modalBalanceHint.textContent = `Available: ₦${fmt(referralBalance)}`;
    }

    modalOverlay.classList.add("open");
    setTimeout(() => modalAmountInput.focus(), 150);
  }

  function closeModal() {
    modalOverlay.classList.remove("open");
    modalMode = null;
  }

  function setModalLoading(isLoading) {
    modalConfirmBtn.disabled = isLoading;
    modalCancelBtn.disabled = isLoading;
    modalConfirmBtn.classList.toggle("loading", isLoading);
  }

  chipButtons.forEach(chip => {
    chip.addEventListener("click", () => {
      chipButtons.forEach(c => c.classList.remove("selected"));
      chip.classList.add("selected");
      modalAmountInput.value = chip.dataset.amount;
      modalError.textContent = "";
    });
  });

  modalAmountInput.addEventListener("input", () => {
    chipButtons.forEach(c => c.classList.remove("selected"));
    modalError.textContent = "";
  });

  modalCloseBtn.addEventListener("click", closeModal);
  modalCancelBtn.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  modalConfirmBtn.addEventListener("click", async () => {
    const amount = parseFloat(modalAmountInput.value);

    if (!amount || isNaN(amount) || amount <= 0) {
      modalError.textContent = "Enter a valid amount.";
      return;
    }

    if ((modalMode === "withdraw" || modalMode === "referral-withdraw") && amount < minWithdrawalAmount) {
      modalError.textContent = `Minimum withdrawal amount is ₦${fmt(minWithdrawalAmount)}`;
      return;
    }

    if (!supabaseClient) {
      modalError.textContent = "Backend unavailable right now. Try again shortly.";
      return;
    }

    if (!currentUserId) {
      modalError.textContent = "Please log in to continue.";
      return;
    }

    if (modalMode === "deposit") {
      // Hand off to Flutterwave's own checkout popup — close our modal
      // first so there's no stuck spinner behind it while the user
      // takes their time entering payment details.
      closeModal();
      initiateFlutterwaveDeposit(amount);
      return;
    }

    setModalLoading(true);
    try {
      if (modalMode === "withdraw") {
        await handleWithdraw(amount, "winnings");
      } else {
        await handleWithdraw(amount, "referral");
      }
      closeModal();
    } catch (err) {
      modalError.textContent = err.message || "Something went wrong.";
    } finally {
      setModalLoading(false);
    }
  });

  // --- 4. DEPOSIT LOGIC — real payment via Flutterwave, verified
  // server-side before anything is ever credited ---
  const FLUTTERWAVE_PUBLIC_KEY = "FLWPUBK-ca6a84e50a9a11b098198cc13e7f0c87-X";
  const VERIFY_DEPOSIT_URL = "https://ijkcqsodtmmavnveflgj.supabase.co/functions/v1/verify-flutterwave-payment";

  async function initiateFlutterwaveDeposit(amount) {
    if (typeof FlutterwaveCheckout !== "function") {
      showToast("Payment system failed to load. Please refresh and try again.", "error");
      return;
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      showToast("Please log in again.", "error");
      return;
    }

    const { data: txRef, error: refError } = await supabaseClient.rpc(
      'create_pending_flutterwave_payment', { p_amount: amount }
    );
    if (refError) {
      showToast(refError.message || "Couldn't start payment.", "error");
      return;
    }

    let settled = false;

    FlutterwaveCheckout({
      public_key: FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: txRef,
      amount: amount,
      currency: "NGN",
      payment_options: "card, banktransfer, ussd",
      customer: {
        email: user.email,
        name: (userDisplayName?.textContent || "Joy-Rise User").replace('👋', '').trim(),
      },
      customizations: {
        title: "Joy-Rise Hub",
        description: "Wallet deposit",
      },
      callback: async (response) => {
        settled = true;
        try {
          const res = await fetch(VERIFY_DEPOSIT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tx_ref: response.tx_ref,
              transaction_id: response.transaction_id,
            }),
          });
          const result = await res.json();

          if (result.success) {
            showToast(`Successfully deposited ₦${amount.toLocaleString()}!`);
            loadUserData();
          } else {
            showToast(result.error || "Payment verification failed.", "error");
          }
        } catch (err) {
          console.error("Deposit verification error:", err);
          showToast("Couldn't verify payment. Contact support if you were charged.", "error");
        }
      },
      onclose: () => {
        if (!settled) {
          showToast("Deposit cancelled.", "error");
        }
      },
    });
  }

  // --- 5. WITHDRAW LOGIC — via secure RPC ---
  async function handleWithdraw(amount, wallet) {
    const { error } = await supabaseClient.rpc('withdraw_funds', {
      p_amount: amount,
      p_wallet: wallet
    });
    if (error) throw error;

    showToast(`Withdrawal request of ₦${amount.toLocaleString()} submitted!`);
    loadUserData();
  }

  // --- 6. BUY TICKET — now a dedicated page (buy-ticket.html) with
  // tier selection, since a single flat-price ticket no longer applies.

  // --- 7. EVENT LISTENERS ---
  if (fabDeposit) fabDeposit.addEventListener("click", () => openModal("deposit"));
  if (btnDeposit) btnDeposit.addEventListener("click", () => openModal("deposit"));
  if (btnWithdraw) btnWithdraw.addEventListener("click", () => openModal("withdraw"));

  if (referralUnlockBtn) referralUnlockBtn.addEventListener("click", () => {
    if (!referralUnlockBtn.disabled) openModal("referral-withdraw");
  });
  if (referralWithdrawBtn) referralWithdrawBtn.addEventListener("click", () => {
    if (!referralWithdrawBtn.disabled) openModal("referral-withdraw");
  });

  if (qaBuyTicket) qaBuyTicket.addEventListener("click", () => { window.location.href = 'buy-ticket.html'; });
  if (qaReferrals) qaReferrals.addEventListener("click", () => { window.location.href = 'referrals.html'; });
  if (qaWinners) qaWinners.addEventListener("click", () => { window.location.href = 'winners.html'; });
  if (qaTxns) qaTxns.addEventListener("click", () => { window.location.href = 'transactions.html'; });

  // --- HEADER: notifications dropdown ---
  const notificationBtn = document.getElementById("notification-btn");
  const notificationPanel = document.getElementById("notification-panel");
  const notificationList = document.getElementById("notification-list");
  const notificationEmpty = document.getElementById("notification-empty");
  const notificationDot = document.getElementById("notification-dot");

  const NOTIF_META = {
    deposit: { icon: "fa-circle-plus", color: "#00b894", text: (t) => `Deposit of ₦${fmt(t.amount)} confirmed` },
    withdrawal: { icon: "fa-circle-arrow-down", color: "#ff7675", text: (t) => `Withdrawal of ₦${fmt(t.amount)} requested` },
    ticket_purchase: { icon: "fa-ticket", color: "#6c5ce7", text: (t) => `Ticket purchased for ₦${fmt(t.amount)}` },
    referral_bonus: { icon: "fa-users", color: "#00b894", text: (t) => `Referral bonus of ₦${fmt(t.amount)} earned` },
    win_payout: { icon: "fa-trophy", color: "#f59f00", text: (t) => `You won ₦${fmt(t.amount)}! 🎉` },
    signup_bonus: { icon: "fa-gift", color: "#f59f00", text: (t) => `₦${fmt(t.amount)} signup credit added` },
  };

  async function loadNotifications() {
    if (!supabaseClient || !currentUserId) return;
    const { data, error } = await supabaseClient
      .from('transactions')
      .select('id, type, amount, status, created_at')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false })
      .limit(8);

    if (error || !data || data.length === 0) {
      notificationEmpty.style.display = "block";
      notificationList.innerHTML = "";
      return;
    }

    notificationEmpty.style.display = "none";
    notificationList.innerHTML = data.map(t => {
      const meta = NOTIF_META[t.type] || { icon: "fa-circle", color: "#636e72", text: () => t.type };
      const timeAgo = new Date(t.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      return `
        <div class="notif-item">
          <div class="notif-icon" style="background:${meta.color}1a; color:${meta.color};">
            <i class="fa-solid ${meta.icon}"></i>
          </div>
          <div class="notif-text">
            <strong>${meta.text(t)}</strong>
            <small>${timeAgo}</small>
          </div>
        </div>
      `;
    }).join('');

    // Show the unread dot if the newest transaction is from the last hour
    const newest = new Date(data[0].created_at);
    if (Date.now() - newest.getTime() < 60 * 60 * 1000) {
      notificationDot.style.display = "block";
    }
  }

  if (notificationBtn) {
    notificationBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      menuPanel.classList.remove("open");
      notificationPanel.classList.toggle("open");
      notificationDot.style.display = "none";
      if (notificationPanel.classList.contains("open")) loadNotifications();
    });
  }

  // --- HEADER: menu dropdown ---
  const menuBtn = document.getElementById("menu-btn");
  const menuPanel = document.getElementById("menu-panel");
  const menuAdminLink = document.getElementById("menu-admin-link");
  const menuLogoutBtn = document.getElementById("menu-logout-btn");

  if (menuBtn) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      notificationPanel.classList.remove("open");
      menuPanel.classList.toggle("open");
    });
  }

  document.addEventListener("click", (e) => {
    if (!notificationPanel.contains(e.target) && e.target !== notificationBtn) {
      notificationPanel.classList.remove("open");
    }
    if (!menuPanel.contains(e.target) && e.target !== menuBtn) {
      menuPanel.classList.remove("open");
    }
  });

  if (menuLogoutBtn) {
    menuLogoutBtn.addEventListener("click", async () => {
      if (supabaseClient) await supabaseClient.auth.signOut();
      window.location.href = 'login.html';
    });
  }

  function triggerConfetti() {
    const colors = ['#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#0984e3', '#e84393'];
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    for (let i = 0; i < 60; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = (Math.random() * 0.4) + 's';
      piece.style.animationDuration = (2.2 + Math.random() * 1.2) + 's';
      piece.style.setProperty('--drift', (Math.random() * 160 - 80) + 'px');
      piece.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      container.appendChild(piece);
    }

    setTimeout(() => container.remove(), 3800);
  }

  // Celebrate a fresh win or referral commission — but only the first
  // time we see it. Uses localStorage per-user so it doesn't refire
  // every page load, and deliberately does NOT celebrate on the very
  // first check for a given browser (avoids confetti-storming someone
  // who already has old wins the first time this feature ships).
  async function checkForCelebration() {
    if (!supabaseClient || !currentUserId) return;
    try {
      const { data } = await supabaseClient
        .from('transactions')
        .select('id, type, amount, created_at')
        .eq('user_id', currentUserId)
        .in('type', ['win_payout', 'referral_bonus'])
        .order('created_at', { ascending: false })
        .limit(1);

      const latest = data && data[0];
      if (!latest) return;

      const seenKey = `joyrise_seen_celebration_${currentUserId}`;
      const lastSeenId = localStorage.getItem(seenKey);

      if (latest.id !== lastSeenId) {
        const isFirstCheckEver = lastSeenId === null;
        localStorage.setItem(seenKey, latest.id);

        if (!isFirstCheckEver) {
          triggerConfetti();
          if (latest.type === 'win_payout') {
            showToast(`🎉 You won ₦${fmt(latest.amount)}! Congratulations!`);
          } else {
            showToast(`🎉 Referral bonus of ₦${fmt(latest.amount)} unlocked!`);
          }
        }
      }
    } catch (err) {
      console.warn("Celebration check skipped:", err);
    }
  }

  // --- BOTTOM NAV ---
  const navPill = document.getElementById("nav-pill");
  const bottomNavbar = document.querySelector(".bottom-navbar");

  function movePillToActiveNav() {
    if (!navPill || !bottomNavbar) return;
    const active = document.querySelector(".nav-item.active");
    if (!active) return;
    const navRect = bottomNavbar.getBoundingClientRect();
    const itemRect = active.getBoundingClientRect();
    navPill.style.left = (itemRect.left - navRect.left) + "px";
    navPill.style.width = itemRect.width + "px";
    navPill.classList.add("ready");
  }

  navItems.forEach(item => {
    item.addEventListener("click", function () {
      const target = this.dataset.target;
      if (this.id === "nav-wallets") {
        document.querySelector(".wallets-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
        navItems.forEach(n => n.classList.remove("active"));
        this.classList.add("active");
        movePillToActiveNav();
        return;
      }
      if (target && target !== 'index.html') {
        window.location.href = target;
        return;
      }
      navItems.forEach(n => n.classList.remove("active"));
      this.classList.add("active");
      movePillToActiveNav();
    });
  });

  // Position the pill once layout has settled (fonts/icons loaded),
  // and again if the phone is rotated or resized
  window.addEventListener("load", movePillToActiveNav);
  window.addEventListener("resize", movePillToActiveNav);
  setTimeout(movePillToActiveNav, 50);

  await loadConfig();
  loadUserData();

  // Check admin status separately (doesn't block the main dashboard load)
  if (supabaseClient) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
      const { data: adminCheck } = await supabaseClient
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      if (adminCheck?.is_admin && menuAdminLink) {
        menuAdminLink.style.display = "flex";
      }
    }
  }
});

})();
