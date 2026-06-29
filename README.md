# LocalApex — Local SEO Multi-Tenant SaaS

A full-stack platform for managing local business presence: review funnels, NAP citation checks, competitor analytics, GBP insights, Q&A, and more — all in a single multi-tenant dashboard.

---

## Features

| Module | Highlights |
|---|---|
| **Smart Review Funnel** | Public `/r/:slug` page — 4–5 ★ routed to Google, <4 ★ captured internally |
| **AI Review Responder** | One-click GPT-4o response generation per review; tone templates |
| **Competitor Analytics** | Track competitors with rating/review count; dual-axis chart |
| **Citation NAP Check** | Compare your Name, Address, Phone across 12+ platforms; per-field diff |
| **GBP Insights** | Views, searches, calls, directions; bar + line chart; CSV import |
| **Q&A Manager** | Publish/unpublish Q&A; AI answer suggestion |
| **Media Manager** | Authenticated file upload by category (exterior, interior, menu, team) |
| **Reports** | Per-location breakdown — reviews, citations, competitors, insights |
| **Webhooks** | HMAC-signed HTTP delivery to any endpoint (Zapier, Slack, etc.) |
| **Notifications** | In-app bell with unread badge; email alerts on new reviews |
| **Activity Log** | Full audit trail of all mutations across the account |
| **Team Management** | Invite/remove team members; role-based access |
| **Onboarding Wizard** | 4-step guided setup modal for new accounts |
| **Global Search** | Debounced search across locations, reviews, Q&A, citations, competitors |

---

## Tech Stack

**Backend** — FastAPI · SQLAlchemy 2 (async) · asyncmy · MariaDB · Alembic · SlowAPI · httpx · python-jose · passlib  
**Frontend** — React 18 · Vite · TypeScript · Tailwind CSS · TanStack Query · Recharts · React Router 6

---

## Quick Start (Local Dev)

### Prerequisites
- Python 3.12+, Node 20+, MariaDB 10.6+

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in your values
python -c "
import asyncio
from database import engine, Base
import models
asyncio.run(engine.begin().__aenter__().__class__.__aenter__(engine.begin()).__class__.__aexit__)"
# easier: run the app once and tables auto-create on startup
uvicorn main:app --reload
```

**Shortcut for table creation:**
```bash
python -c "
import asyncio
from database import engine, Base
import models
async def go():
    async with engine.begin() as c:
        await c.run_sync(Base.metadata.create_all)
asyncio.run(go())
"
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

### Seed admin account
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@example.com","password":"secret123","role":"admin"}'
```

---

## Docker (one command)

```bash
cp backend/.env.example backend/.env   # edit APP_SECRET_KEY at minimum
docker compose up --build
```

- Frontend → http://localhost
- API → http://localhost:8000
- API docs → http://localhost:8000/docs

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and set:

| Variable | Required | Description |
|---|---|---|
| `APP_SECRET_KEY` | ✅ | JWT signing secret (change in production) |
| `DATABASE_URL` | ✅ | `mysql+asyncmy://user:pass@host:3306/dbname` |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated CORS origins |
| `OPENAI_API_KEY` | Optional | Enables AI review responses + Q&A suggestions |
| `SMTP_HOST` / `SMTP_USERNAME` / `SMTP_PASSWORD` | Optional | Enables email alerts on new reviews |
| `FRONTEND_URL` | Optional | Used in password reset links (default: `http://localhost:5173`) |

---

## API Reference

Interactive docs at **http://localhost:8000/docs** (Swagger UI) or `/redoc`.

Key endpoints:

```
POST /api/v1/auth/register          Register + auto-login
POST /api/v1/auth/login             Get JWT token
POST /api/v1/auth/forgot-password   Send reset email
POST /api/v1/auth/reset-password    Confirm reset with token

GET  /api/v1/locations              List locations
POST /api/v1/locations/import-csv   Bulk import from CSV

POST /api/v1/reviews/public/{slug}  Public review submission (no auth)
GET  /api/v1/reviews                List reviews (paginated, filterable)
GET  /api/v1/reviews/stats          Unread count + averages

GET  /api/v1/citations              List citations
POST /api/v1/citations/{id}/check   Run NAP diff check

GET  /api/v1/insights/summary       Aggregated GBP metrics
GET  /api/v1/insights/timeseries    Trend data by metric + date range

GET  /api/v1/search?q=              Global search (5 entity types)
GET  /api/v1/reports/overview       Per-location summary
GET  /api/v1/activity               Audit log
GET  /api/v1/notifications          In-app notifications
```

---

## Project Structure

```
localApex/
├── backend/
│   ├── models/          SQLAlchemy ORM models (multi-tenant)
│   ├── routers/         FastAPI route handlers
│   ├── schemas/         Pydantic request/response schemas
│   ├── services/        Business logic (auth, AI, email, webhooks)
│   ├── alembic/         Database migrations
│   ├── main.py          App factory + middleware
│   └── config.py        Settings (pydantic-settings)
├── frontend/
│   ├── src/
│   │   ├── api/         Axios client + typed endpoint functions
│   │   ├── components/  Reusable UI (DataTable, Pagination, SlideOver…)
│   │   ├── context/     Auth, Tenant, Toast React contexts
│   │   ├── hooks/       TanStack Query data hooks
│   │   ├── pages/       Route-level page components
│   │   └── types/       Shared TypeScript interfaces
│   └── nginx.conf       Production SPA routing config
├── docker-compose.yml
└── README.md
```

---

## License

MIT
