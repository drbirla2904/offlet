# OFFlet Production Deployment Runbook

This is the single step-by-step deployment and operations guide for the current OFFlet repository. It describes a single-origin deployment: Nginx serves the React app and proxies `/api/` to Django/Gunicorn. PostgreSQL and Redis stay on private networks; media uses any installed, shared Django storage backend. This is a launch baseline, not a capacity guarantee. Validate it on staging before serving real customers.

## 1. Choose the production services

Prepare these services before deploying code:

1. A Linux host or container platform for Django, Celery, and Nginx. Run app processes as a non-root service account.
2. A managed PostgreSQL database reachable only from the application network, with automated backups and a tested restore procedure.
3. A managed Redis service for Django cache and Celery broker/result backend. Require TLS where supported.
4. A shared, durable object-storage backend supported by Django. The backend is configurable; S3-compatible storage is optional, not required. Keep uploaded files private and use short-lived signed URLs where the provider supports them.
5. An SMS provider and a small adapter callable for the project's `SMS_BACKEND` setting. Production will not start without it.
6. A DNS name and HTTPS certificate. The example uses one public origin, `https://example.com`, with `/api/` reverse-proxied to Django.

Keep credentials in a secret manager or workload identity. Do not put production `.env` files, database passwords, storage keys, or SMS credentials in Git, frontend variables, build logs, or browser code. `VITE_*` values are public to website visitors.

## 2. Prepare DNS, TLS, and the host

1. Point the public DNS record for the chosen domain to the Nginx/load-balancer address.
2. Open only HTTPS publicly (and HTTP only long enough to redirect or issue certificates). Keep PostgreSQL, Redis, and Gunicorn on private interfaces.
3. Install the repository's supported Python runtime, Node.js/npm for frontend builds, Nginx, and the operating-system build libraries required by Pillow and psycopg2. Alternatively, build the frontend in CI and ship only `frontend/dist` to the web host.
4. Create a dedicated service account and application directories. The example Nginx file assumes `/srv/localoffers/frontend/dist` and `/srv/localoffers/backend/staticfiles`; update these paths if your release layout differs.
5. Obtain and renew the TLS certificate before exposing the site. Replace the example domain/certificate paths in `deploy/nginx/localoffers.conf.example` and validate the result with `nginx -t`.

## 3. Configure the backend environment

Create `/srv/localoffers/backend/.env` with mode `0600`, owned by the service account. Django reads this file for management commands, and systemd can load the same file for long-running services. On managed platforms, inject secrets through the platform instead. Start from `backend/.env.example`, remove development values, and set at least:

```dotenv
DEBUG=False
DJANGO_SECRET_KEY=<generate-a-random-key>
ALLOWED_HOSTS=example.com
DATABASE_URL=postgresql://USER:PASSWORD@DB_HOST:5432/localoffers
CACHE_URL=rediss://REDIS_HOST:6379/1
CELERY_BROKER_URL=rediss://REDIS_HOST:6379/0
CELERY_RESULT_BACKEND=rediss://REDIS_HOST:6379/0
FRONTEND_URL=https://example.com
CORS_ALLOWED_ORIGINS=
CSRF_TRUSTED_ORIGINS=https://example.com
DRF_NUM_PROXIES=1
DB_CONN_MAX_AGE=60
PUBLIC_API_CACHE_SECONDS=15
MEDIA_STORAGE_BACKEND=your_installed_package.storage.PrivateMediaStorage
MEDIA_STORAGE_OPTIONS='{"provider_specific_option":"value"}'
SMS_BACKEND=your_project.integrations.sms.send_sms
```

Generate a secret key with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

`MEDIA_STORAGE_BACKEND` is a dotted Django storage backend path. Install the package and SDK that provider requires, pass its non-secret settings as JSON in `MEDIA_STORAGE_OPTIONS`, and supply credentials through workload identity or the provider's secret manager. `filesystem` is for local development only; production rejects it. Each provider may require different CORS, private-access, and signed-URL options, so verify the selected backend actually issues URLs compatible with the frontend.

Implement `SMS_BACKEND` as a callable with signature `send_sms(phone_number, message)`. Keep provider credentials outside source control. The development console adapter logs the OTP and is explicitly refused in production. Production OTP values are not logged or returned to clients.

If a CDN/load balancer is in front of Nginx, configure trusted real-IP handling before setting `DRF_NUM_PROXIES`. The default `1` is only correct when Django sees exactly one trusted proxy. Never trust arbitrary client-supplied `X-Forwarded-For` values. If using a database transaction pooler, set `DB_CONN_MAX_AGE=0` unless that pooler supports session pooling.

Production settings fail startup for missing secrets, hosts, PostgreSQL, Redis, HTTPS frontend origin, SMS backend, or a non-filesystem media backend. The default one-year HSTS is enabled; subdomain inclusion and preload remain off until every relevant hostname is HTTPS-only. `check --deploy` reports those two optional HSTS warnings until then.

## 4. Prepare and migrate the database

From the checked-out release, install the pinned backend dependencies and run preflight checks. Management commands automatically load `backend/.env`; on managed platforms, run them with the platform's secret/environment injection. Do not commit the production environment file or print it in logs.

```bash
cd /srv/localoffers/backend
python -m venv venv
venv/bin/pip install -r requirements.txt
venv/bin/python manage.py check --deploy
venv/bin/python manage.py makemigrations --check --dry-run
```

Before the first migration on a production database, take a backup. Then apply schema changes and initialize required categories:

```bash
venv/bin/python manage.py migrate
venv/bin/python manage.py seed_categories
venv/bin/python manage.py collectstatic --noinput
venv/bin/python manage.py createsuperuser
```

Do not run `seed_demo_marketplace` against a public production database unless those clearly labeled demo listings are intentionally meant to be public. The shopkeeper policy acceptance table is part of the normal migrations; existing shopkeepers will be asked to accept the current versions before their next shop-management action.

## 5. Configure media storage and migrate uploads

1. Provision a private bucket/container using the selected provider. Enable encryption, versioning or equivalent recovery, lifecycle controls, and an application identity limited to the required object operations.
2. Configure `MEDIA_STORAGE_BACKEND` and `MEDIA_STORAGE_OPTIONS`. Configure provider CORS for frontend `GET`/`HEAD` requests if required by that provider.
3. Copy existing files from `backend/media/` using the selected provider's migration tool, preserving paths. Verify shop logos, product photos, review images, and private verification documents before cutover.
4. Confirm verification documents remain private. The provided Nginx config returns 404 for `/media/`; Django API responses use the configured storage URLs.
5. Do not point a public CDN at private verification documents. If the provider cannot issue time-limited private URLs, use a custom storage backend or authenticated download endpoint before launch.

## 6. Build the frontend

For the single-origin layout, build API requests as relative `/api` URLs:

```bash
cd /srv/localoffers/frontend
npm ci
VITE_API_BASE_URL=/api npm run build
```

Deploy the contents of `frontend/dist` to the directory used by Nginx. The Nginx SPA fallback (`try_files ... /index.html`) is required for routes such as `/shops/123`, `/terms`, and `/dashboard`.

The service worker precaches the app shell and does not cache API responses. When releasing a frontend, verify that `dist/sw.js` and its Workbox asset deploy with the same release as the HTML and JavaScript assets.

## 7. Start application processes

Run Gunicorn separately from Nginx, bound to loopback. The checked-in `backend/gunicorn.conf.py` starts with eight synchronous workers and bounded worker recycling; treat that as a starting point, not a universal worker count. Protect environment files with owner-only permissions and keep storage options valid JSON.

Example systemd web service (adjust user, paths, and concurrency for the host):

```ini
[Unit]
Description=OFFlet Django API
After=network-online.target

[Service]
User=localoffers
Group=www-data
WorkingDirectory=/srv/localoffers/backend
EnvironmentFile=/srv/localoffers/backend/.env
Environment=GUNICORN_BIND=127.0.0.1:8000
ExecStart=/srv/localoffers/backend/venv/bin/gunicorn config.wsgi:application --config gunicorn.conf.py
Restart=on-failure
RestartSec=3
PrivateTmp=true
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

Save the unit as `/etc/systemd/system/localoffers-web.service`, then load and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now localoffers-web
```

Run Celery as two separate supervised services. Use the same protected environment file as the web process. Start with worker concurrency 2 and run exactly one beat scheduler.

Worker systemd unit:

```ini
[Unit]
Description=OFFlet Celery worker
After=network-online.target

[Service]
User=localoffers
Group=www-data
WorkingDirectory=/srv/localoffers/backend
EnvironmentFile=/srv/localoffers/backend/.env
ExecStart=/srv/localoffers/backend/venv/bin/celery -A config worker -l INFO --concurrency=2
Restart=on-failure
RestartSec=3
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

Beat unit: use the same unit structure, save it as `/etc/systemd/system/localoffers-beat.service`, and change `Description` to `OFFlet Celery beat` and `ExecStart` to `/srv/localoffers/backend/venv/bin/celery -A config beat -l INFO`. Do not run more than one beat process.

Save the worker unit as `/etc/systemd/system/localoffers-worker.service`, then start all services:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now localoffers-web localoffers-worker localoffers-beat
```

Size database connections for all web workers, Celery workers, admin processes, and operational jobs combined. Do not increase worker or task concurrency without monitoring connection use, worker RSS, queue age, and latency.

## 8. Configure Nginx and activate HTTPS

1. Copy `deploy/nginx/localoffers.conf.example` into the host's Nginx configuration.
2. Replace `server_name`, TLS certificate paths, frontend root, and static-file alias.
3. Keep Gunicorn bound to loopback. Keep database, Redis, and storage management endpoints private.
4. Preserve the API/admin request limits and the `/media/` 404. Tune limits only from observed traffic and documented staging tests.
5. If using a CDN, configure its trusted proxy addresses and Nginx real-IP module before relying on IP-based throttles.
6. Check and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Provision separate systemd services for Celery worker and the single beat process. Configure log rotation and forward service logs to your centralized logging system; never log OTPs, credentials, or full authorization headers.

## 9. Smoke-test before opening traffic

Run from an external/staging client after DNS and HTTPS are active:

```bash
curl -fsS https://example.com/ >/dev/null
curl -fsS https://example.com/health/live/
curl -fsS https://example.com/health/ready/
curl -fsS https://example.com/api/categories/
```

Then verify these flows in a private browser session and as a shopkeeper test account:

1. OTP request and verification use the configured SMS provider; no OTP appears in production logs or the response.
2. New shopkeepers accept the current Terms, Privacy Policy, and Shopkeeper & Offer Rules before creating or changing listings.
3. Shopkeepers can create a business, product, and offer; publish and turn off offers; and upload images to the chosen storage provider.
4. Guests can browse shops and offers, and public pages display the correct signed media URLs.
5. A verification document is not publicly retrievable; authorized staff can download it through the authenticated admin flow.
6. CORS, redirects, token refresh, maps links, email/SMS callbacks, and legal routes work at the production origin.

The legal documents are operational drafts. Have qualified counsel review them for each operating jurisdiction before accepting customers or sellers.

## 10. Load-test staging and set alerts

Install k6 on a staging load-generator host and start small:

```bash
k6 run --env BASE_URL=https://staging.example.com --env MAX_VUS=25 deploy/loadtest/k6-public-browse.js
```

The scenario models the eight parallel home-feed requests. The initial guardrails are under 1% failed requests, p95 below 800 ms, and p99 below 1.5 s. Increase `MAX_VUS` gradually only after reviewing results. Do not stress production without an approved window and active monitoring. A single load-generator IP hits normal DRF/Nginx rate limits; use distributed generators for capacity tests rather than disabling production protections.

Monitor and alert on Nginx 429/5xx rates, Gunicorn saturation/restarts, API p95/p99, PostgreSQL CPU/slow queries/connection count, Redis memory/latency, Celery queue age, object-storage errors, host CPU/memory/disk, and OTP delivery failure rates. Record release commit, database size, dataset distribution, and host sizing with each test result.

Back up PostgreSQL and object storage on a schedule, monitor backup success, and test restore procedures. Analytics event tables grow with traffic; define and test an event retention/rollup policy before sustained large-scale traffic.

## 11. Release, rollback, and incident procedure

1. Open a pull request. GitHub Actions runs backend checks/tests on Python 3.13 and 3.14 and frontend lint/build on Node 24. Merge only when these required checks pass. Dependabot opens weekly grouped update PRs for GitHub Actions, npm, and pip dependencies; review and merge those through the same pipeline.
2. Build and test an immutable release artifact. Back up the database and record the currently deployed release before changing production.
3. Run `check --deploy`, migration checks, and staging smoke/load tests on the candidate.
4. Deploy the backend release, apply forward-compatible migrations, collect static assets, then deploy the matching frontend build and service-worker files.
5. Restart/reload web and worker processes in a controlled order. Check health endpoints, error rates, queue age, and a real shopkeeper/guest flow.
6. If application checks fail, roll back the application artifact and frontend assets. Do not blindly reverse destructive database migrations; restore data only from a verified backup under the incident procedure.
7. Keep previous static assets available long enough for cached clients to update. Document the incident, user impact, recovery, and follow-up actions.

The checked-in workflow validates changes; it does not deploy them. Add a provider-specific deployment job only after choosing a host and secrets strategy. Require successful CI and staging checks before allowing that job to update production.

This runbook does not claim a capacity guarantee. Production readiness depends on the selected infrastructure, SMS adapter, storage backend, real dataset, tested backups, monitoring, and measured staging results.
