# LocalApex Platform Guide

A multi-tenant Local SEO SaaS platform for managing Google Business Profile presence,
reviews, citations, and local search performance across single or multi-location businesses.

---

## 1. Architecture Overview

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  React Frontend │◄────►│  FastAPI Backend  │◄────►│  MySQL Database │
│  (Vite + TS)    │ REST │  (async/await)    │ ORM  │  (single DB,    │
│  localhost:5173 │      │  localhost:8000   │      │  tenant_id col) │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                   │
                  ┌────────────────┼────────────────┬─────────────────┐
                  ▼                ▼                 ▼                 ▼
          Google Business    Zernio API        Resend (email)   Razorpay (billing)
          Profile API     (15 social platforms)  Firebase Auth
```

**Stack:**
- **Backend:** FastAPI (Python), SQLAlchemy async ORM, `asyncmy` MySQL driver, Alembic migrations
- **Frontend:** React 18 + TypeScript + Vite, TanStack Query, Tailwind CSS, Recharts
- **Auth:** JWT (own login) + Firebase Auth (Google Sign-In)
- **Multi-tenancy:** Single shared database, every table scoped by `tenant_id` (UUID)

**Repo layout:**
```
backend/
  models/       SQLAlchemy ORM models (one tenant_id-scoped table per feature)
  routers/      FastAPI route handlers, one file per feature domain
  services/     Business logic: auth, email, zernio client, firebase
  alembic/      DB migrations
frontend/
  src/pages/    One React page per feature/route
  src/pages/admin/   Superadmin-only platform management pages
  src/api/endpoints.ts   All API client functions, grouped by domain
  src/context/  Auth, Tenant, Toast React contexts
```

---

## 2. Multi-Tenancy Model

- One MySQL database, every business-data table has a `tenant_id` column
- A **Tenant** = one business/customer account (e.g. "Maveric InfoTech")
- A **User** belongs to exactly one Tenant, with a `role`: `owner`, `admin`, `viewer`, or `superadmin`
- `superadmin` is a platform-level role (LocalApex's own team) that can see/manage **all** tenants via the Admin Panel — this is the only role not scoped to a single tenant
- Every authenticated API call carries a JWT with `sub` (user id), `tenant_id`, and `role`; the backend filters all queries by `tenant_id` from the token, not from request params — so tenants cannot access each other's data even if they guess an ID

---

## 3. End-to-End User Onboarding Flow

### Step 1 — Sign up
`POST /api/v1/auth/register` (or Google Sign-In via Firebase)
- User provides: name, email, password, business name
- A new **Tenant** row is created (`plan_type=free`, `status=trial`)
- A new **User** row is created with `role=owner`, linked to that tenant
- JWT issued immediately, user is logged in

### Step 2 — Connect Google Business Profile
On the **Locations** page → **"Import from Google"**
- `GET /api/v1/gmb/connect` → returns a Google OAuth URL (scope: `business.manage`)
- User authorizes on Google's consent screen
- Google redirects to `GET /api/v1/gmb/callback` with an auth code
- Backend exchanges the code for access + refresh tokens, stores the refresh token on the Tenant
- Backend calls the GMB API to list all the user's business locations and **auto-imports** them (name, address, phone, website) into the `locations` table
- User is redirected back to `/locations?gmb=imported&count=N`

*(Alternative: manually add a location via the "+ Add Location" form, or bulk import via CSV.)*

### Step 3 — Reviews start flowing in
- Reviews can arrive two ways:
  1. **Public review funnel**: each location gets a unique `funnel_slug` and a QR code; customers scan it, leave a star rating, and (if ≥4★) get redirected to the real Google review page, or (if <4★) submit private feedback that stays internal — this protects the business's public rating while still capturing unhappy customers
  2. **CSV import** of existing reviews (`POST /reviews/import-csv`)
- Reviews are scored for sentiment (`positive`/`neutral`/`negative`) and surfaced in the Reviews inbox

### Step 4 — Manage reputation
- **Reviews page**: filter by rating/sentiment/status, assign to a team member, generate an AI-drafted reply (`POST /reviews/{id}/generate-response`), send a reply (emails the reviewer via Resend if their email was captured)
- **Q&A Manager**: track and AI-suggest answers to Google Business Profile Q&A
- **Citations**: track NAP (Name/Address/Phone) consistency across directories (Yelp, JustDial, etc.), bulk import, recheck status
- **Competitors**: track competitor ratings/review counts over time for benchmarking

### Step 5 — Marketing & growth
- **Campaigns**: schedule bulk "request a review" emails to a customer list for a specific location
- **Social Posting**: connect Google Business Profile + 14 other platforms via Zernio, compose and schedule posts
- **Media Manager**: upload and organize photos for listings
- **Public Profile**: each tenant gets a branded public page at `/biz/{slug}` showing rating, reviews, and contact info — shareable as a "link in bio"
- **Widget Embed**: an embeddable review-display widget for the business's own website

### Step 6 — Multi-location oversight
- **All Locations** overview page: health-score card per location (grade, review velocity, response rate)
- **Reports**: per-location and portfolio-wide performance reports, scheduled email digests
- **Dashboard**: review trend chart, sentiment breakdown, key KPIs at a glance

### Step 7 — Billing
- `GET /billing/plans` → free/starter/pro/enterprise tiers
- `POST /billing/create-subscription` → creates a Razorpay subscription, returns checkout details
- `POST /billing/verify-payment` → verifies Razorpay signature, upgrades `tenant.plan_type`
- `POST /billing/webhook` → Razorpay webhook for renewal/cancellation events

### Step 8 (platform team only) — Superadmin oversight
A LocalApex team member with `role=superadmin` sees an **Admin Panel** (🛡️) in their sidebar:
- **Platform stats**: total tenants, active/trial split, signup trend, plan breakdown
- **Tenant management**: search/filter all tenants, change plan/status inline, **impersonate** (debug as that tenant)
- **User management**: view/change role of any user on the platform

---

## 4. Feature Inventory (by module)

| Module | What it does | Key endpoints |
|---|---|---|
| Auth | Register/login (JWT + Firebase Google), password reset, team invites | `/auth/*` |
| Tenants | Business profile settings, API key, GDPR data export | `/tenants/*` |
| Locations | CRUD, CSV import, QR code generation, NAP editor | `/locations/*`, `/nap/*` |
| Reviews | Inbox, public funnel, AI replies, assignment, internal notes, health score | `/reviews/*` |
| Q&A | Track and answer Google Business Profile questions | `/qa/*` |
| Citations | NAP consistency tracking across directories | `/citations/*` |
| Competitors | Competitor rating/review tracking + history | `/competitors/*` |
| Campaigns | Scheduled bulk review-request email campaigns | `/campaigns/*` |
| Media | Photo upload/management per location | `/media/*` |
| Templates | Reusable response templates for reviews | `/templates/*` |
| Insights | Custom metric tracking, CSV import, time-series | `/insights/*` |
| Reports | Per-location & portfolio reports, email digests | `/reports/*` |
| Notifications | In-app notification feed + preferences (email/push toggles) | `/notifications/*`, `/notification-prefs/*` |
| Webhooks | Outbound webhooks for review/location events | `/webhooks/*` |
| Billing | Razorpay subscription management | `/billing/*` |
| GMB | Google Business Profile OAuth + location auto-import | `/gmb/*` |
| Zernio | Social posting across 15 platforms (incl. GBP) | `/zernio/*` |
| Public | Public branded business profile page (no auth) | `/public/biz/{slug}` |
| Widget | Embeddable review widget for external sites | `/widget/*` |
| Search | Global search across reviews/locations/citations | `/search` |
| Activity | Audit log of account actions | `/activity` |
| Admin | Superadmin-only platform management | `/admin/*` |

---

## 5. Authentication Flow Detail

```
┌──────────┐   email/password    ┌─────────┐   bcrypt verify   ┌──────────┐
│  Login   │ ──────────────────► │ /auth/  │ ─────────────────►│  users   │
│  page    │                     │ login   │                    │  table   │
└──────────┘                     └────┬────┘                    └──────────┘
                                       │ issues JWT {sub, tenant_id, role}
                                       ▼
                              localStorage: token, user
                                       │
                       every API call: Authorization: Bearer <token>
                                       ▼
                         FastAPI Depends(get_current_user)
                         decodes JWT → injects {sub, tenant_id, role}
                         into every route handler
```

Google Sign-In path: Firebase Auth on the frontend → ID token → `POST /auth/firebase-login` →
backend verifies the Firebase token, finds-or-creates a User/Tenant, issues the same kind of JWT.

---

## 6. What "Production Deployment" Currently Means

Right now the app runs **locally only**:
- Backend: `uvicorn main:app --reload` on `localhost:8000`
- Frontend: `vite` dev server on `localhost:5173`
- MySQL: local instance via Herd

There is a `Dockerfile` in both `backend/` and `frontend/`, and an `nginx.conf`, but no
docker-compose, CI/CD, or cloud deployment has been set up yet. This is the main gap before
LocalApex can be used by real customers outside your own machine.
