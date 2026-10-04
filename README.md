# Joy-Rise Hub

A mobile-first raffle/lottery ticket platform. Users buy tickets into scheduled draws for a chance to win cash prizes, earn commission by referring new users, and build a daily cashback streak. Built as a vanilla HTML/CSS/JS Progressive Web App backed by Supabase (Postgres + Auth) and Flutterwave for payments.

## Features

**For users**
- Email/password auth with email confirmation, password reset, and account suspension handling
- Buy raffle tickets by tier (Starter, Pro, Elite, Premium, VIP, Diamond) or a custom amount, in bulk
- Pay from Main Wallet, Referral Wallet, or a mix with platform cashback applied as a discount
- Live draw view with countdown, results, and a public winners feed
- Referral program: custom promo codes, a leaderboard, and commission paid in real time when referred users spend real money (commission excludes any cashback-covered portion)
- 7-day daily check-in streak with escalating cashback rewards and a free ticket on day 7
- Deposits and withdrawals via Flutterwave (bank transfer, card, USSD), with bank account verification
- Transaction history and ticket history, both searchable and filterable
- Dark mode, installable PWA (offline shell, add-to-home-screen), push notifications

**For admins** (`admin.html` — "Control Deck")
- Overview, activity feed, and configurable withdrawal/milestone settings
- Ticket tier management
- User management: search, suspend/unsuspend with a reason (visible only to the admin team), promote to admin with granular permissions
- Winners tab: every winning ticket with real name/phone for payout and support, separate from the masked public name shown on the live Winners page
- Fraud signals (shared-IP detection across accounts)
- Role-based admin permissions (Overview, Activity Feed, Withdrawals, Milestones, Settings, Tickets, Users, Fraud Signals)

## Tech stack

- **Frontend:** plain HTML/CSS/JavaScript, no build step, no framework. One `<script>`-tag-per-page setup.
- **Backend:** [Supabase](https://supabase.com) — Postgres database, Auth, and Postgres functions (RPC) called directly from the client via `supabase-js`. Business logic (ticket purchases, commissions, admin actions) lives in `SECURITY DEFINER` Postgres functions, not in client JS.
- **Payments:** [Flutterwave](https://flutterwave.com) for deposits and withdrawals, verified server-side via Supabase Edge Functions before any balance is credited.
- **PWA:** `manifest.json` + `service-worker.js` for installability and offline fallback (`offline.html`).

## Project structure

```
.
├── index.html              # Main dashboard (wallets, check-in, quick actions)
├── login.html / signup.html / forgot-password.html / update-password.html / confirm-email.html
├── buy-ticket.html         # Tier selection + purchase flow
├── my-tickets.html         # Ticket purchase history
├── transactions.html       # Deposit/withdrawal/purchase history
├── live-draw.html          # Live draw status + countdown
├── winners.html            # Public winners feed
├── referrals.html          # Referral program, leaderboard, promo code
├── profile.html            # Display name, public name, password, avatar
├── bank-details.html       # Withdrawal bank account setup
├── help.html                # Support contact + FAQ
├── admin.html               # Admin "Control Deck" (single large file, tabbed)
├── terms.html / privacy-policy.html / cookies.html
├── 404.html / offline.html / push-debug.html
├── auth.js                 # Shared Supabase client + service worker registration
├── app.js                  # Dashboard logic (wallets, deposits, withdrawals, check-in)
├── ui-helpers.js            # Shared: friendly error messages, rate limiting, CAPTCHA hook, device fingerprint
├── service-worker.js
├── style.css                 # Single shared stylesheet for the whole app
└── manifest.json
```

There is no build step. Every page links `style.css` and loads its own inline `<script>` at the bottom, after the shared `auth.js` and (where needed) `ui-helpers.js`.

## Setup

1. **Supabase project**
   The Supabase URL and anon key are set directly in `auth.js`. The anon key is safe to expose publicly — it only has the access granted by Row Level Security policies and the `SECURITY DEFINER` functions. To point this app at a different Supabase project, update `SUPABASE_URL` and `SUPABASE_ANON_KEY` at the top of `auth.js`.

2. **Database**
   The schema and Postgres functions (`buy_ticket`, `claim_daily_checkin`, `admin_*`, `fn_require_admin`, etc.) live in Supabase itself, not in this repo. There is no migrations folder — changes are applied by running SQL directly in the Supabase SQL editor. Key tables referenced throughout the app: `profiles`, `tickets`, `ticket_tiers`, `transactions`, `referrals`, `draws`, `draw_schedule_slots`, `draw_winners`, `device_checkin_log`, `app_config`.

   After creating or replacing any Postgres function, run:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
   so PostgREST (the API layer Supabase uses for RPC calls) picks it up immediately instead of waiting for its own cache cycle.

3. **Flutterwave**
   Deposit/withdrawal verification happens in Supabase Edge Functions (`verify-flutterwave-payment`, `list-flutterwave-banks`, `resolve-bank-account`, `log-auth-ip`) — not included in this repo, deployed separately to Supabase.

4. **Serving the app**
   Since there's no build step, any static file host works (the pages use relative paths throughout). Locally, serve the folder with any static server, e.g.:
   ```
   npx serve .
   ```
   Don't open the HTML files directly via `file://` — the service worker and some fetch calls require an actual HTTP origin.

## Notes for contributors

- Postgres functions in this project are gated by `fn_require_admin(p_permission text default null)` — calling it with no argument checks "is this user an admin at all"; calling it with a permission key (e.g. `fn_require_admin('tickets')`) also checks that specific permission.
- When adding a **new** overload of an existing Postgres function (e.g. adding a parameter), remember Postgres treats a different parameter list as a *new, separate* function rather than replacing the old one — drop the stale overload explicitly or calls can become ambiguous ("function is not unique").
- User-facing error messages should never show raw Postgres/Supabase error text — route them through `JoyRiseUI.friendlyError()` in `ui-helpers.js`, which maps known errors to friendly copy and otherwise falls back to a generic message, while still passing through this app's own custom `raise exception '...'` messages from Postgres functions (those are already written to be user-readable).

## License

Proprietary — all rights reserved.
