# Deploying LocalApex to Hostinger (Shared Hosting via SSH)

Target domain: `localapex.mavericinfotech.in`

---

## Prerequisites

- Hostinger Business/Cloud hosting plan (Python support via Passenger)
- SSH access enabled in Hostinger hPanel
- A subdomain `localapex.mavericinfotech.in` pointed to the hosting account
- MySQL database created in hPanel

---

## 1. Create MySQL Database in hPanel

In hPanel → Databases → MySQL Databases:
- Database name: `localapex`
- Username: (note it down)
- Password: (set a strong password, note it down)
- Host: `localhost` (Hostinger internal MySQL is on localhost)

---

## 2. SSH into Hostinger

```bash
ssh u123456789@yourhostname.hostinger.com
# Or use the SSH details from hPanel → Advanced → SSH Access
```

---

## 3. Upload the Backend

From your local machine:
```bash
# On your local machine — upload backend files
rsync -avz --exclude='venv' --exclude='__pycache__' --exclude='.env' \
  /Users/dexter/Herd/localApex/backend/ \
  u123456789@yourhostname.hostinger.com:~/domains/localapex.mavericinfotech.in/public_html/api/
```

Or use Git (recommended):
```bash
# SSH into server
cd ~/domains/localapex.mavericinfotech.in/
git clone https://github.com/imshailesh593/LocalApex.git localapex
```

---

## 4. Set Up Python Virtual Environment

```bash
cd ~/domains/localapex.mavericinfotech.in/localapex/backend

# Create venv (Hostinger has Python 3.11+)
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## 5. Create .env File on Server

```bash
nano ~/domains/localapex.mavericinfotech.in/localapex/backend/.env
```

Paste and fill in:
```env
APP_NAME=LocalApex
APP_ENV=production
APP_SECRET_KEY=CHANGE_THIS_TO_A_LONG_RANDOM_STRING_64_CHARS
APP_DEBUG=false
DATABASE_URL=mysql+asyncmy://DB_USER:DB_PASSWORD@localhost:3306/localapex
ALLOWED_ORIGINS=https://localapex.mavericinfotech.in
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
FRONTEND_URL=https://localapex.mavericinfotech.in

# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@mavericinfotech.in

# Zernio
ZERNIO_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Google Business Profile OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Razorpay (add when ready)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# OpenAI (for AI review replies)
OPENAI_API_KEY=
```

Generate a secure APP_SECRET_KEY:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## 6. Run Database Migrations

```bash
cd ~/domains/localapex.mavericinfotech.in/localapex/backend
source venv/bin/activate
alembic upgrade head
```

Expected output: series of migration steps ending with `d1e9f2a05b83 (head)`

---

## 7. Create Superadmin Account

```bash
# Register via the API (run once after migrations)
python3 -c "
import asyncio
from passlib.context import CryptContext
from database import AsyncSessionLocal
from sqlalchemy import text
import uuid

pwd = CryptContext(schemes=['bcrypt'], deprecated='auto')

async def main():
    async with AsyncSessionLocal() as db:
        # Create tenant
        tid = str(uuid.uuid4())
        uid = str(uuid.uuid4())
        await db.execute(text('''
            INSERT INTO tenants (id, business_name, api_key, status, plan_type, brand_color)
            VALUES (:tid, \"LocalApex Platform\", :ak, \"active\", \"enterprise\", \"#1d4ed8\")
        '''), {'tid': tid, 'ak': uuid.uuid4().hex})
        
        # Create superadmin user
        hashed = pwd.hash(\"CHANGE_THIS_PASSWORD\")
        await db.execute(text('''
            INSERT INTO users (id, tenant_id, name, email, password_hash, role)
            VALUES (:uid, :tid, \"Admin\", \"admin@localapex.in\", :pwd, \"superadmin\")
        '''), {'uid': uid, 'tid': tid, 'pwd': hashed})
        await db.commit()
        print(\"Superadmin created: admin@localapex.in\")

asyncio.run(main())
"
```

---

## 8. Configure Passenger for FastAPI (ASGI)

Create `~/domains/localapex.mavericinfotech.in/.htaccess`:
```apache
PassengerEnabled on
PassengerAppRoot /home/u123456789/domains/localapex.mavericinfotech.in/localapex/backend
PassengerPython /home/u123456789/domains/localapex.mavericinfotech.in/localapex/backend/venv/bin/python3
PassengerAppType wsgi
PassengerStartupFile passenger_wsgi.py
```

Or via hPanel → Advanced → Passenger → set App Root to backend directory.

---

## 9. Build and Deploy Frontend

On your local machine:
```bash
cd /Users/dexter/Herd/localApex/frontend

# Create production .env
echo "VITE_API_BASE_URL=https://localapex.mavericinfotech.in/api/v1" > .env.production

# Build
npm run build

# Upload dist/ to public_html
rsync -avz dist/ u123456789@yourhostname.hostinger.com:~/domains/localapex.mavericinfotech.in/public_html/
```

---

## 10. Configure API Routing

The frontend (React SPA) lives at `public_html/` and the backend API must be routed to Passenger.

Create `public_html/.htaccess`:
```apache
# Route /api/* to Python backend via Passenger
RewriteEngine On

# Serve API through Passenger
RewriteRule ^api/(.*)$ /api/$1 [L]

# React SPA fallback (all other routes serve index.html)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

---

## 11. Update Frontend API URL

In `frontend/src/api/client.ts`, the base URL must point to the production API.
Create `frontend/.env.production`:
```
VITE_API_BASE_URL=https://localapex.mavericinfotech.in/api/v1
```

Then in `frontend/src/api/client.ts`, ensure:
```ts
const BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
```

---

## 12. SSL / HTTPS

Enable free SSL in hPanel → SSL → Let's Encrypt for `localapex.mavericinfotech.in`.

---

## 13. Verify Deployment

```bash
# Backend health
curl https://localapex.mavericinfotech.in/api/v1/health

# Login
curl -X POST https://localapex.mavericinfotech.in/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@localapex.in","password":"YOUR_PASSWORD"}'
```

---

## Post-Deployment Checklist

- [ ] `alembic upgrade head` ran successfully
- [ ] Superadmin account created
- [ ] SSL enabled and HTTPS working
- [ ] Login works at `https://localapex.mavericinfotech.in/login`
- [ ] Google OAuth redirect URI updated to production URL in Google Cloud Console
- [ ] Razorpay webhook URL updated to `https://localapex.mavericinfotech.in/api/v1/billing/webhook`
- [ ] Add production domain to Zernio allowed origins
- [ ] Test "Import from Google" flow end to end

---

## Updating the App (After Initial Deploy)

```bash
# SSH into server
cd ~/domains/localapex.mavericinfotech.in/localapex
git pull origin main

# Apply any new migrations
cd backend && source venv/bin/activate && alembic upgrade head

# Rebuild frontend locally and re-upload
# (on local machine)
cd frontend && npm run build
rsync -avz dist/ u123456789@hostname:~/domains/localapex.mavericinfotech.in/public_html/

# Restart Passenger (touch restart.txt)
touch ~/domains/localapex.mavericinfotech.in/localapex/backend/tmp/restart.txt
```
