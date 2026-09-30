# Local Offers Marketplace — Frontend (React + TypeScript)

Guest-first local-deals discovery app, talking to the Django/DRF backend in
`../backend`. Built with Vite, React 19, React Router, TanStack Query is
installed but the current pages use plain `useEffect` fetches for simplicity
— swap in `@tanstack/react-query` hooks as the app grows if you want caching/
retries for free.

## Stack
Vite + React 19 + TypeScript, Tailwind CSS v4 (via `@tailwindcss/vite`,
config lives as CSS `@theme` tokens in `src/index.css` — no `tailwind.config.js`
needed), Axios with JWT-refresh interceptor, React Router v7.

## Quick start

```bash
npm install
cp .env.example .env      # point VITE_API_BASE_URL at your backend
npm run dev                # http://localhost:5173
```

Make sure the backend is running first (see `../backend/README.md`) and that
its `CORS_ALLOWED_ORIGINS` includes `http://localhost:5173` (it does by default).

`npm run build` type-checks (`tsc -b`) then builds to `dist/`.

## Auth: phone number + OTP, no password

`PhoneOtpForm` (`src/components/PhoneOtpForm.tsx`) is the whole sign-in flow —
phone number → 6-digit code — shared by both the full-page `/login` and the
"Login to continue" modal, so there's exactly one place to update it. A
brand-new phone number is created in the same call as a returning one signs
in; the customer/shopkeeper toggle and optional name field are shown
alongside the OTP input (not as a separate step) since the frontend can't
know in advance whether a number is already registered without a lookup
call that would let the API be used to enumerate phone numbers.

In local dev, the backend has no real SMS gateway wired up — when it
returns a `debug_otp` field (only happens when the backend's `DEBUG=True`),
`PhoneOtpForm` shows it via a toast so you can actually log in without
sending a real text. This never appears against a production backend.

## How the guest-first rule is implemented

- `AuthContext` holds the JWT + current user; `tokenStore` (in `api/client.ts`)
  persists tokens in `localStorage` and auto-refreshes on 401.
- `GuestContext` generates a UUID on first visit (`lo_guest_id` in
  localStorage), used for logging guest views/interactions and synced to
  `/api/auth/guest-session/<id>/` so it can be migrated into a real account
  on registration.
- **`useRequireAuth()`** (`src/hooks/useRequireAuth.ts`) is the single chokepoint
  for "this action needs login": wrap any handler in it — save, follow, review,
  report, chat — and it opens the global `<LoginModal />` instead of running
  the action when the person isn't logged in. The API also enforces this
  server-side (401 / `{code: "login_required"}`), and the Axios interceptor
  in `api/client.ts` opens the same modal automatically if a stray call slips
  through without `useRequireAuth`.
- Call / WhatsApp / Directions / Share buttons never go through `useRequireAuth`
  — they're guest-friendly per the spec, they just log the interaction.

## Pages

| Route | Purpose |
|---|---|
| `/` | Guest-first home feed — categories, Offers Near You, Flash Deals, Clearance, Under ₹499, 50%+ OFF, Popular Shops |
| `/search` | Full search + filters (category, discount, price, verified-only, expiring soon, ordering) |
| `/offers/:id` | Offer detail — gallery, price, countdown, Call/WhatsApp/Directions/Save/Share/Chat/Report |
| `/shops/:id` | Shop profile — offers tab + reviews tab, follow button |
| `/categories` | Category grid |
| `/saved` | Saved offers + followed shops (login required — guarded via bottom nav) |
| `/login` | Phone number + OTP sign-in; customer/shopkeeper toggle shown alongside the OTP input for new numbers |
| `/account`, `/account/messages`, `/account/messages/:id` | Profile, notifications, chat |
| `/list-your-business` | Marketing landing page for shopkeeper acquisition |
| `/dashboard`, `/dashboard/setup`, `/dashboard/offers`, `/dashboard/offers/new`, `/dashboard/offers/:id/edit` | Shopkeeper side — all behind `<RequireShopkeeper>` |

## PWA + Android app

This app is a full PWA via `vite-plugin-pwa` (configured in `vite.config.ts`):
installable (Add to Home Screen), offline-capable for anything already
visited (Workbox precaches the app shell; API calls are deliberately
**never** cached — see the `navigateFallbackDenylist`/`runtimeCaching`
comments in `vite.config.ts` — offers/stock/prices must always be fresh),
and themed to match the brand (`theme_color`/`background_color` in the
manifest track `--color-marigold`/`--color-canvas`).

`../android/` wraps this into a real Play Store app via a Trusted Web
Activity — it's the same PWA, not a separate build; see `android/README.md`
for the actual build/publish steps (needs Android Studio, which this
environment can't run).

All icons (web favicon/PWA + Android launcher/adaptive icons) are generated
from one script — `frontend/scripts/generate-icons.py` (needs `pip install
Pillow`) — so the brand mark can't drift between platforms. Rerun it after
changing brand colors rather than hand-editing icon files.

`PhoneOtpForm` also wires up the **WebOTP API**: on Chrome for Android (and
inside the TWA, same engine), the OTP input auto-fills from the incoming SMS
with no permission prompt, no native code — see `src/hooks/useWebOtpAutofill.ts`.
It's pure progressive enhancement (a no-op on desktop/iOS/older Android,
where the user just types the code), and depends on the backend formatting
the SMS with a trailing `@domain #code` line — see backend README's Auth
section for the exact format and why the domain must match `FRONTEND_URL`.

## Mobile compatibility

This app is mobile-first (bottom nav below `sm:`, guest-first flows are the
primary use case), but a few real narrow-screen issues had slipped in.
Fixed, and worth knowing about if you're extending the UI:

- **Chat thread page** used a `100vh`-based fixed-height layout, which is
  unreliable on mobile (iOS Safari's address bar and the on-screen keyboard
  both resize `vh` unpredictably — the message input could end up hidden).
  Replaced with a normal-scrolling page and a `sticky bottom-20` input bar
  (`bottom-20` clears the fixed mobile bottom nav; `sm:bottom-4` on desktop
  where that nav is hidden).
- **`env(safe-area-inset-*)`** padding added to the bottom nav and top bar,
  and `viewport-fit=cover` added to the viewport meta tag, so content isn't
  obscured by the iPhone home indicator / notch if this is added to a home
  screen.
- **"List Your Business"** was only reachable from a `hidden sm:flex` link —
  completely unreachable on mobile. Added a compact icon entry point in the
  mobile top bar.
- **Opening-hours editor**: a day label + checkbox + two `<input type="time">`
  in one unwrapped flex row doesn't fit under ~420px (native time inputs
  won't shrink much below ~90px each). Now wraps the time inputs to their own
  line on narrow screens via `flex-wrap`.
- **Text truncation footgun**: Tailwind's `truncate`/`line-clamp` only takes
  effect on a flex item if that item (or a wrapper) also has `min-w-0` — flex
  items default to `min-width: auto`, which silently blocks shrinking below
  the text's natural width and can push a sibling (like a status badge or
  "Follow" button) off-screen instead of truncating. Audited and fixed every
  row pairing user-generated text (business/offer names, which are arbitrary
  length) against a fixed-width sibling — see `BusinessProfile`, `Dashboard`,
  `OfferList`, `Messages`. If you add a new title-plus-button row, give the
  text side `min-w-0` (and `flex-1` if it's meant to grow) and the button
  side `shrink-0`.
- A defensive `overflow-x: hidden` on `body` (in `index.css`) stops the whole
  page from scrolling sideways if something still miscalculates its width —
  it doesn't affect the intentional horizontal scrollers (offer rails,
  category chips), which manage their own `overflow-x-auto` independently.
- Modal close buttons were text-sized tap targets; bumped to a proper
  36px+ touch target.

I don't have a way to render actual screenshots in this environment, so this
was a systematic code-level audit (checked every flex row with competing
fixed/flexible content, every fixed-width value, and known mobile-viewport
footguns) rather than a visual one. If something still looks off on your
device, the fastest way to get it fixed is to tell me which page and, ideally,
a screenshot — a code review can't catch everything a real device will.

## Category scoping (Fashion shop only sees fashion categories, etc.)

`BusinessSetupPage` fetches `categoriesApi.topLevel()` (groups only, e.g.
"Fashion & Apparel") for the registration category picker. `OfferForm`
fetches `categoriesApi.forBusiness(businessId)` — re-run every time the
selected business changes — so a shop registered under "Fashion & Apparel"
only ever sees "Men's Fashion" / "Women's Fashion" / "Kids" / "Footwear" when
creating an offer, never "Electronics" or "Grocery". This is UI convenience
only; the backend enforces the same rule server-side (see backend README's
"Category scoping" section) so it can't be bypassed by calling the API
directly.

## Feedback & loading UI

- `ToastContext` (`useToast()`) gives transient success/error/info notifications
  — used for save/follow, review/report submission, and clipboard-copy
  confirmations, instead of `alert()` or silently-swallowed errors.
- `apiErrorMessage()` (`src/utils/apiError.ts`) extracts a readable message
  from a DRF error response (which is a per-field dict like
  `{"email": ["already exists"]}`, not a single `.detail` string) — use it in
  any new `catch` block instead of guessing at `err.response.data.detail`.
- `src/components/Skeletons.tsx` — shimmer placeholders for offer/business
  rails while loading, used on the home page.

## Design

Tokens in `src/index.css` (`@theme` block): a warm "local bazaar" palette —
marigold-orange as the one bold accent (discount tags, CTAs), deep ink for
text, teal reserved only for trust/verification signals so it never competes
with the marigold. Fraunces for display headings/prices, Inter for UI text.
Offer cards use a die-cut "price tag" notch (`.tag-notch` in `index.css`)
instead of a plain badge, so the discount reads as a physical tag.

The home page opens with a `FeaturedCarousel` — full-bleed cards for offers
an admin has marked Featured/Trending/Sponsored (`?promoted=true` on the
offers API). Sponsored items are labeled plainly rather than blended in.

## Known gaps / what to build next

- `/dashboard/settings` covers opening hours + verification-document upload;
  business **photos** (the gallery on the public profile, as opposed to
  product photos) still has no upload screen — `BusinessPhoto` exists on the
  backend, wire up a manager like `ProductImageManager` for it.
- Notifications are polled every 30s for the unread-count badge (bottom nav
  + desktop username) via `useUnreadNotifications`; there's no real-time
  push. Swap the poll for a websocket/SSE feed if you need instant delivery.
- Admin UI is intentionally Django admin (see backend README) — build a
  custom `/admin` React section later if you want it in-app.
- `ProductImageManager` (multi-image upload, set-primary, delete) is wired
  into the offer **edit** screen only — offer creation still uploads a single
  image inline to keep the "under a minute" flow fast; open the offer for
  editing right after creating it if you want to add more photos immediately.

## Fixed this round (worth knowing about)

Two bugs existed since the original build and only surfaced under real
testing — both are fixed now, but if you're diffing against an older copy:
- Un-favoriting/un-following from a card (clicking the heart or "Following"
  again) used to only update local state and never called the API, so it
  silently didn't persist. Now calls `favoritesApi.removeByOffer` /
  `followsApi.removeByBusiness` (new backend endpoints — see backend README).
- `/api/favorites/` and `/api/follows/` used to return a bare numeric id for
  the nested offer/business, which would have crashed the Saved page
  (`OfferCard`/`BusinessCard` expect a full object). Now expanded server-side.
