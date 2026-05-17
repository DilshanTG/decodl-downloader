# StockMart.lk — Sri Lanka's Stock Media Downloader

Download from Shutterstock, Freepik, Adobe Stock, Envato Elements & 20+ providers. Pay in LKR.

**Stack:** Wasp 0.22.0 · React · Node.js · PostgreSQL · DigiMart Payments · Decodl API

---

## Deploy

### Frontend → Vercel

1. Import this repo on [vercel.com](https://vercel.com)
2. Vercel auto-detects `vercel.json` — no extra config needed
3. Add one environment variable:

| Variable | Value |
|----------|-------|
| `REACT_APP_API_URL` | Your Railway backend URL (e.g. `https://stockmart-backend.up.railway.app`) |

### Backend → Railway

1. Import this repo on [railway.app](https://railway.app)
2. Railway uses `railway.toml` automatically
3. Add a PostgreSQL plugin in Railway dashboard
4. Set all environment variables from `.env.server.example`

### Database → Neon (free PostgreSQL)

1. Create a free DB at [neon.tech](https://neon.tech)
2. Copy the connection string into `DATABASE_URL` env var on Railway

---

## Local Development

```bash
# Terminal 1 — start the database
cd app && wasp db start

# Terminal 2 — run the app
cd app && wasp start

# First time only — run migrations + seed providers
cd app && wasp db migrate-dev && wasp db seed
```

Copy `app/.env.server.example` → `app/.env.server` and fill in your credentials.

**Dev URLs:** Frontend `http://localhost:3000` · Backend `http://localhost:3001`

---

## Environment Variables

See `app/.env.server.example` for all required variables:
- `DECODL_APP_KEY` + `DECODL_TOKEN` — from decodl.ir dashboard
- `PAYHERE_MERCHANT_KEY` + `PAYHERE_MERCHANT_SECRET` — from DigiMart
- `ADMIN_EMAILS` — comma-separated emails that get admin access
- `SENDGRID_API_KEY` — for transactional email (optional in dev)

---

## Features

- Credit-based downloads — buy LKR packages, download stock media
- 24+ providers with auto URL detection
- Single & bulk download with batch grouping
- Live cost pre-check before every download
- Auto-refund on failed downloads
- DigiMart payment webhook with HMAC verification
- Admin dashboard for users, downloads, payments
- Bilingual UI (English + සිංහල)
