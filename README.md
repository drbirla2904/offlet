# Local Offers Marketplace

A local-offers discovery platform: shopkeepers publish offers and turn them
ON, nearby customers discover them with **no login required**, and it drives
real store visits (call / WhatsApp / directions). Login is only required for
saving, following, reviewing, reporting, and chat.

Three deployable projects:

- **`backend/`** — Django 6 + Django REST Framework API (JWT auth, Celery for
  offer scheduling/expiry). Start here — see `backend/README.md`.
- **`frontend/`** — React 19 + TypeScript + Tailwind v4, talking to the API.
  Also an installable PWA (manifest + offline-capable service worker via
  `vite-plugin-pwa`) — see `frontend/README.md`.
- **`android/`** — a Trusted Web Activity wrapping the frontend into a real,
  Play-Store-installable Android app with almost no native code of its own
  (it just launches the deployed website full-screen). Needs Android
  Studio to actually build — see `android/README.md` for the full setup
  and the Digital Asset Links step that makes it "trusted" rather than
  showing a browser URL bar.

## Fastest path to a running app locally

```bash
# Terminal 1 — backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_categories
python manage.py createsuperuser
python manage.py runserver

# Terminal 2 — frontend
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`. Sign in with any phone number — the backend has
no real SMS gateway wired up yet, so in local dev (`DEBUG=True`) the OTP is
shown to you directly via a toast instead of being texted (see backend
README's "Auth" section for plugging in a real provider). Pick "I'm a
Shopkeeper" when verifying, create a business (`/dashboard/setup`), publish
an offer, then open an incognito window to browse it as a guest — no login
needed to see it, call the shop, or get directions.

## What's implemented vs. the original spec

This covers the MVP scope end to end (guest browsing, offer lifecycle with
auto discount calculation, ON/OFF/schedule/duplicate, stock tracking, search
+ filters + geo-distance sorting, favorites/follows/reviews/reports all
correctly gated behind login, chat, shopkeeper dashboard analytics, Django
admin as the MVP admin panel), plus a polish pass on top: phone number + OTP
sign-in (no password, no email required — see backend README's "Auth"
section), mobile-fit fixes throughout, a Featured/Trending/Sponsored hero
carousel on the home page, a toast notification system, skeleton loading
states, an opening-hours editor and verification-document upload for
shopkeepers, a full product-photo gallery manager, and category scoping (a
business registered under "Fashion & Apparel" only ever sees fashion
sub-categories when creating an offer — enforced both in the UI and
server-side, see each README's "Category scoping" section), and an Android
app — the frontend is a full PWA (installable, works offline for anything
already viewed) wrapped in a Trusted Web Activity for the Play Store, with
WebOTP so the login code auto-fills from SMS on Android Chrome without the
user leaving the app (see `android/README.md` and frontend README's "Auth"
section). Payments/subscriptions, a real SMS gateway, PostGIS-grade geo
search at scale, and a business-photo gallery UI are deliberately left as
documented extension points — see the "Scaling notes" and "Known gaps"
sections in each README, so you know exactly what to build next rather than
hitting an undocumented wall.

I built this by actually running both halves against each other while
writing it — registered shopkeepers and customers through the real OTP
flow, created businesses/products/offers, confirmed the discount
auto-calculates, confirmed guests can call/browse with no auth and get
blocked-with-a-modal on save/favorite, and confirmed both `createsuperuser`
and Django admin login work correctly now that phone number (not email) is
the account identifier — rather than just generating code. The backend's
migrations run clean and the frontend type-checks and builds with zero
errors as of this delivery.
