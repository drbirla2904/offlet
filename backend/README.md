# Local Offers Marketplace — Backend (Django + DRF)

A local-offers discovery API: shopkeepers publish offers, nearby customers
discover them without logging in, and the whole thing drives real store visits.
Built to the MVP scope in the product spec (guest-first browsing, offer
ON/OFF + scheduling, login required only for save/follow/review/report/chat).

## Stack
Django 6.1 + Django REST Framework, JWT auth (SimpleJWT), SQLite for local
dev / Postgres for production, Celery + Redis for offer expiry & scheduling,
django-cors-headers for the separate React frontend.

## Quick start (local dev, SQLite)

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # DATABASE_URL is commented out by default — leave it
                                 # that way for local dev; it falls back to SQLite
python manage.py migrate
python manage.py seed_categories
python manage.py createsuperuser
python manage.py runserver
```

API is now at `http://localhost:8000/api/`, Django admin at `/admin/`
(use it as the MVP admin panel — see "Admin" below).

## Switching to Postgres for production

Set `DATABASE_URL` in `.env`, e.g.:
```
DATABASE_URL=postgres://localoffers:yourpassword@localhost:5432/localoffers
```
Then `python manage.py migrate` again against the new database.

## Running Celery (offer expiry, scheduling, low-stock/expiry notifications)

Needs Redis running (`redis-server`, or a managed Redis instance — set
`CELERY_BROKER_URL`/`CELERY_RESULT_BACKEND` in `.env`).

```bash
celery -A config worker -l info
celery -A config beat -l info      # runs the scheduled tasks in config/settings.py CELERY_BEAT_SCHEDULE
```

Without Celery running, offers you create with a start/end time just won't
auto-activate/auto-expire on schedule — everything else works fine; you can
still call `POST /api/offers/<id>/publish/`, `/turn_on/`, `/turn_off/` by hand.

## Auth — phone number + OTP (no password, no email required)

JWT via SimpleJWT, but the sign-in method is a 6-digit code texted to the
phone number, matching how people actually expect to log into a local
marketplace app. There's no separate register/login split — verifying a
brand-new phone number creates the account in the same call.

- `POST /api/auth/otp/request/` `{phone_number}` → `{status, expires_in}`
  (plus `debug_otp` **only when `DEBUG=True`** — see "No SMS gateway wired
  up yet" below). Rate-limited: 30s between requests for the same number,
  max 5 requests/hour.
- `POST /api/auth/otp/verify/` `{phone_number, otp, role?, username?, guest_id?}`
  → `{user, tokens: {access, refresh}, created}`. `role` (`customer` or
  `shopkeeper`, defaults to `customer`) and `username` are only used the
  *first* time a number signs in — ignored for a returning user, so it's
  safe for the frontend to always send them. A code expires after 5 minutes,
  allows 5 incorrect attempts before it's invalidated, and can only be used
  once.
- `POST /api/auth/token/refresh/` `{refresh}` → `{access}`
- `GET/PATCH /api/auth/me/` — current user + customer profile
- `GET/PUT /api/auth/guest-session/<uuid>/` — non-sensitive guest prefs (section 39),
  migrated into the customer's profile automatically if `guest_id` is passed at verify time.

Send `Authorization: Bearer <access>` on authenticated requests.

### No SMS gateway wired up yet

`accounts/otp.py`'s `send_sms(phone_number, message)` is the one function to
replace with a real provider — MSG91, Twilio, or Exotel are the common
choices for Indian phone numbers; it's deliberately a two-argument function
so any of them drop in easily. Until you do:
- Every OTP is logged via Python's `logging` (visible in the `runserver` console).
- **When `DEBUG=True`**, `POST /api/auth/otp/request/` also returns the code
  directly in the JSON response as `debug_otp`, so local development and
  testing work with zero SMS account configured. This field is never present
  when `DEBUG=False` — nothing to remember to strip out before going live,
  it's structurally impossible for it to leak in production as long as
  `DEBUG=False` there (which it must be regardless, for unrelated security
  reasons — see Django's deployment checklist).

### Django admin / staff login

`USERNAME_FIELD` is `phone_number`, so `python manage.py createsuperuser`
now prompts for a phone number (not email/username), and the admin login
page at `/admin/` is labeled "Phone number" — log in with the phone number
+ the password you set via `createsuperuser`, not OTP (OTP is only wired up
for the customer/shopkeeper-facing API, not Django's own admin auth).

## Core endpoints

| Purpose | Endpoint |
|---|---|
| Categories (public) | `GET /api/categories/` (all), `?top_level=true` (groups only, e.g. "Fashion & Apparel" — for the business-registration picker), `?parent=<id>` (children of a category), `?for_business=<id>` (exactly what that business's offer form should offer — see below) |
| Browse/search shops | `GET /api/businesses/?lat=&lng=&radius_km=&city=&category=&search=&verified_only=true` |
| Shop profile | `GET /api/businesses/<id>/` |
| My businesses (shopkeeper) | `GET /api/businesses/mine/` |
| Submit verification docs | `POST /api/businesses/<id>/submit_verification/` (multipart, `document`) |
| Products | `GET/POST /api/products/?business=<id>` |
| Product images | `GET /api/product-images/?product=<id>`, `POST /api/product-images/` (multipart), `DELETE /api/product-images/<id>/`, `POST /api/product-images/<id>/set_primary/` |
| Browse offers (guest-friendly) | `GET /api/offers/?lat=&lng=&radius_km=&category=&min_price=&max_price=&min_discount=&offer_type=&tag=&city=&verified_only=true&expiring_soon=true&search=&ordering=` |
| Featured/Trending/Sponsored (home hero carousel) | `GET /api/offers/?promoted=true` (or `is_featured=true` / `is_trending=true` / `is_sponsored=true` individually — admin-set only, see `offers/admin.py`) |
| My offers (shopkeeper) | `GET /api/offers/?mine=true&status=draft` |
| Create/edit offer | `POST/PATCH /api/offers/` — send `original_price`+`offer_price`, `discount_percentage` is computed for you |
| Publish / turn on / turn off / duplicate | `POST /api/offers/<id>/publish/`, `/turn_on/`, `/turn_off/`, `/duplicate/` |
| Log a view (guest ok) | `POST /api/offers/<id>/log_view/` `{guest_id?}` |
| Log call/whatsapp/directions/share (guest ok) | `POST /api/offers/<id>/interact/` `{type: "call"\|"whatsapp"\|"directions"\|"share"}` |
| Favorite an offer (login required) | `POST /api/favorites/` `{offer}`; remove with `DELETE /api/favorites/<favorite_id>/` or `DELETE /api/favorites/by-offer/<offer_id>/` (the one the frontend actually uses, since offer cards only carry the offer id, not the favorite record's id) |
| Follow a shop (login required) | `POST /api/follows/` `{business}`; remove with `DELETE /api/follows/<follow_id>/` or `DELETE /api/follows/by-business/<business_id>/` |
| Reviews (read = guest ok, write = login required) | `GET/POST /api/reviews/?business=<id>` |
| Report an offer (login required) | `POST /api/reports/` `{offer, reason, note?}` |
| Chat (login required both sides) | `POST /api/conversations/` `{business, offer?}`, then `GET/POST /api/conversations/<id>/messages/` |
| Notifications | `GET /api/notifications/`, `POST /api/notifications/<id>/mark_read/`, `POST /api/notifications/mark_all_read/`, `GET /api/notifications/unread_count/` |
| Shopkeeper dashboard stats | `GET /api/analytics/dashboard/?business=<id>` |

`ordering` values on `/api/offers/`: `-created_at` (newest, default), `distance`,
`-discount`, `price`, `-price`, `expiring_soon`, `-popular`.

`GET /api/favorites/` and `GET /api/follows/` return the full nested offer/
business object under `offer`/`business` (card-ready — includes price, image,
discount, business name, etc.), even though `POST` only needs the bare id.

### The guest-first rule, enforced in the API

- Every `GET` on offers/businesses/categories/reviews works with **no auth header at all**.
- `interact` accepts `call`/`whatsapp`/`directions`/`share` from guests; anything
  else (report, chat) returns a 400 with `{"code": "login_required", ...}` if unauthenticated.
- `favorites`, `follows`, `reviews` (write), `reports`, and `conversations` all
  require a JWT — a 401/403 from these is your frontend's cue to show the
  "Login to continue" modal (see `LoginRequiredActionMixin` in `core/mixins.py`),
  not a hard redirect.

## Category scoping: a business only offers categories from its own group

Categories are a two-level hierarchy (`Category.parent`, seeded by
`seed_categories`): a top-level **group** (e.g. "Fashion & Apparel",
"Electronics & Mobile", "Automobile") containing specific **sub-categories**
(e.g. "Men's Fashion", "Women's Fashion", "Kids", "Footwear").

- A business registers under exactly one **group** (`Business.category` must
  have `parent=None` — enforced in `BusinessDetailSerializer.validate_category`).
- A product/offer's category must be one of that group's sub-categories (or
  the group itself, for a group with no sub-categories, like a synthetic
  single-purpose category) — enforced in `ProductSerializer.validate`, not
  just in the UI, so this can never be bypassed via a direct API call.
- `GET /api/categories/?for_business=<id>` returns exactly the valid options
  for that business's offer form in one call — the frontend's `OfferForm`
  re-fetches this whenever the selected business changes.

Adding a new group: edit `GROUPS` in `catalog/management/commands/seed_categories.py`
and rerun `python manage.py seed_categories` (idempotent — safe to rerun
anytime, including against a DB that already has categories). The command
refuses to run if a group's name collides with one of its own sub-category
names (`Category.name` is globally unique), so a typo here fails loudly
instead of silently corrupting the hierarchy.

## Admin (MVP)

Django admin (`/admin/`) is the section-32 admin panel for the MVP: manage
categories, approve/reject/suspend business verification (bulk actions on the
`Business` list), moderate reviews and offer reports, mark offers Featured/
Trending/Sponsored. A dedicated custom admin frontend can replace this later
without touching the API.

## Scaling notes (read before you hit real traffic)

- **Geo search** is plain haversine + a lat/lng bounding-box pre-filter
  (`core/geo.py`), fine up to tens of thousands of active offers. When you
  outgrow it, swap in GeoDjango + PostGIS (`PointField` + `annotate(distance=...)`)
  — every call site here only needs `distance_km` on each object, so the swap
  is contained to `core/geo.py` and the two `list()` overrides in
  `businesses/views.py` / `offers/views.py`.
- **Images** are stored via `MEDIA_ROOT` (local disk) by default — swap to
  S3/Cloud Storage via `django-storages` before you have real traffic across
  more than one app server.
- **Tags** on `Offer` are a plain `JSONField` list for MVP simplicity; the values
  are restricted to `core.choices.OfferTag`. If you need to filter/aggregate by
  tag heavily, normalize into a real `OfferTag` M2M model later.
- `discount_percentage`, `view_count`, `favorite_count`, `share_count`,
  `rating_average`, `follower_count` are denormalized for fast list rendering.
  They're kept in sync in the views/serializers that mutate the underlying
  data — if you add a new way to create a favorite/review/view, keep it in sync too.

## Project layout

```
config/          settings, urls, celery app
core/            shared choices/enums, geo helpers, permissions, pagination
accounts/        custom User, CustomerProfile, GuestSession, JWT auth views
businesses/      Business, BusinessPhoto, BusinessVerification
catalog/         Category, Product, ProductImage
offers/          Offer (+ lifecycle, filters, Celery tasks)
engagement/      FavoriteOffer, FollowBusiness, Review, OfferReport
chatapp/         Conversation, Message
notifications/   Notification (+ Celery tasks)
analytics/       OfferView, OfferInteraction, SearchEvent, dashboard endpoint
```
