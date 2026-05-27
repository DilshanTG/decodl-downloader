# StockMart.lk — Project Reference

> Last updated: May 2026  
> Owner: Dilshan Gunasakera — DigiMart Solutions (Pvt) Ltd  
> Contact: dilshantg4u@gmail.com

---

## What Is This?

StockMart.lk is a **credit-based stock media download SaaS** for Sri Lankan designers and agencies.  
Users buy LKR credit packages and use them to download from 20+ premium providers (Shutterstock, Adobe Stock, Freepik, Envato, etc.) without needing USD subscriptions.

---

## Live URLs

| Service | URL |
|---------|-----|
| Frontend | https://www.stockmart.lk |
| Backend API | https://api.stockmart.lk |
| Downloads CDN | https://dl.stockmart.lk |
| Admin Panel | https://www.stockmart.lk/admin |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Wasp 0.22.0 (OpenSaaS template) |
| Frontend | React 19, Tailwind CSS v4, shadcn/ui, Vite |
| Backend | Node.js, Express (Wasp-generated) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 5.19 |
| Auth | Wasp email auth (JWT + sessions) |
| Email | SendGrid (noreply@stockmart.lk) |
| Payments | DigiMart / PayHere (LKR) |
| Downloads | Decodl API |
| File Delivery | Cloudflare Worker (dl.stockmart.lk) |

---

## Infrastructure

| Service | Provider | Details |
|---------|----------|---------|
| Frontend hosting | Vercel | Project: `stockmart` |
| Backend hosting | Railway | Project: `stockmart`, Service: `stockmart` |
| Database | Supabase | Region: ap-northeast-1 (Tokyo) |
| DNS + CDN | Cloudflare | stockmart.lk |
| Download Worker | Cloudflare Workers | `stockmart-dl` worker |
| Email | SendGrid | Free tier, 100/day |

---

## Deploy Commands

```bash
# Deploy everything (backend ~8 min, frontend ~3 min)
bash deploy.sh

# Frontend only (~3 min — no backend restart)
bash deploy.sh frontend

# Backend only (~8 min — needed for schema/code changes)
bash deploy.sh backend
```

**Note:** Never use GitHub for deploys — always use the CLI commands above.

---

## Environment Variables (Railway — Backend)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL (pgBouncer pooled) |
| `DIRECT_URL` | Supabase direct connection (for migrations) |
| `WASP_SERVER_URL` | https://api.stockmart.lk |
| `WASP_WEB_CLIENT_URL` | https://www.stockmart.lk |
| `JWT_SECRET` | Auth token signing key |
| `SENDGRID_API_KEY` | Email sending (SG.opdq...) |
| `ADMIN_EMAILS` | dilshantg4u@gmail.com |
| `DECODL_API_KEY` | Decodl download service |
| `DECODL_API_URL` | Decodl endpoint |
| `DIGIMART_MERCHANT_ID` | Payment gateway |
| `DIGIMART_SECRET` | Payment gateway secret |
| `NODE_ENV` | production |

---

## Key Source Files

```
stockgrab/
├── deploy.sh                    ← Deploy script (ONLY use this)
├── railway.toml                 ← Railway config (healthcheck etc.)
├── vercel.json                  ← Vercel SPA rewrite rules
├── Dockerfile                   ← Root Dockerfile for Railway builds
├── cf-worker/                   ← Cloudflare Worker (dl.stockmart.lk)
│   ├── wrangler.toml
│   └── src/index.ts
└── app/
    ├── main.wasp                ← Routes, pages, queries, actions, auth config
    ├── schema.prisma            ← Database schema
    ├── .env.server              ← Local dev env vars (NOT committed)
    ├── migrations/              ← Prisma migration history
    └── src/
        ├── admin/               ← Admin dashboard pages + operations
        ├── auth/                ← Login, signup, email templates
        ├── credits/             ← Credit balance, transactions
        ├── dashboard/           ← Main download UI (DashboardPage.tsx)
        ├── downloads/           ← History page, download detail
        ├── payment/             ← Pricing page, payment operations
        ├── landing-page/        ← Public homepage (LandingPage.tsx)
        ├── decodl/              ← Decodl API client + job processor
        ├── user/                ← Account page, UserDropdown
        ├── contact/             ← Contact page
        └── legal/               ← Terms, Privacy, Refund policy
```

---

## Database Models (schema.prisma)

### User
- `id`, `email`, `username`, `isAdmin`
- `name`, `phone` — collected on signup
- `credits`, `reservedCredits` — download balance
- `lifetimeCreditsEarned`, `lifetimeCreditsSpent`, `lifetimeSpentLKR`
- `freeCreditsClaimed` — admin-approved welcome bonus (2 credits)

### Download
- `userId`, `providerSlug`, `status` (pending/processing/completed/failed/refunded)
- `decodlJobId`, `downloadUrl`, `downloadToken`
- `creditsCharged`, `errorMessage`

### Payment
- `userId`, `amountLKR`, `creditsAwarded`, `status` (pending/paid/failed)
- `digiMartOrderId`

### CreditTransaction
- `userId`, `amount`, `balance`, `type`, `description`
- Types: `purchase`, `download`, `refund`, `admin_adjust`

### ProviderPricing
- `slug`, `displayName`, `creditCost`, `isActive`, `sortOrder`

---

## Credit System

| Action | Credits |
|--------|---------|
| Welcome bonus | 2 (admin approves manually) |
| Package purchase | Varies (see Pricing page) |
| Successful download | Deducted (per provider cost) |
| Failed download | Auto-refunded |
| Admin adjustment | Manual (admin panel) |

**Flow:** User buys credits with LKR → pastes stock URL on dashboard → system charges credits → Decodl downloads the file → user gets download link via dl.stockmart.lk

---

## Admin Panel Pages

| Page | URL | Purpose |
|------|-----|---------|
| Overview | /admin | Stats, revenue, recent activity |
| Users | /admin/users | Manage users, approve free credits, reset passwords |
| Downloads | /admin/downloads | All downloads with filters |
| Payments | /admin/payments | All LKR payments |
| Credits | /admin/credits | Credit transaction ledger |
| Providers | /admin/providers | Provider pricing and toggle |
| Failed Downloads | /admin/failed-downloads | Failed jobs (for Decodl refund requests) |
| Settings | /admin/settings | System settings |

### Admin Actions Available
- Approve 2 free welcome credits per user (one-time)
- Adjust credits (add or deduct) with reason
- Force retry failed download
- Send password reset email to user
- Toggle admin status
- Update provider pricing / toggle provider on/off

---

## Email Templates

Located in: `app/src/auth/email-and-pass/emails.ts`

| Email | Trigger |
|-------|---------|
| Verification email | On signup |
| Password reset | Via admin panel or forgot password |

Sender: `noreply@stockmart.lk` via SendGrid  
⚠️ SendGrid domain not yet verified — emails may land in spam. Verify at: sendgrid.com → Settings → Sender Authentication

---

## Download Flow (Technical)

1. User pastes URL on `/dashboard`
2. Frontend detects provider from URL
3. `submitDownload` action: reserves credits, creates Download record (status=pending)
4. `processDecodlSubmission` job: submits to Decodl API
5. Polling job checks status every 30s
6. On success: `confirmDownloadCharge` deducts credits, saves download URL
7. On failure: credits auto-refunded, status=failed
8. User downloads via `https://dl.stockmart.lk/file/{id}?token={token}`

---

## Cloudflare Worker (dl.stockmart.lk)

- Proxies download requests to Railway backend
- Adds auth token validation
- Deploy: `cd cf-worker && wrangler deploy`
- Config: `cf-worker/wrangler.toml`

---

## Pending / To-Do

- [ ] Verify `stockmart.lk` sender domain in SendGrid (removes spam risk)
- [ ] Set up Gravatar for noreply@stockmart.lk (profile picture in emails)
- [ ] Configure Cloudflare Email Routing for noreply@stockmart.lk inbox
- [ ] Blog section (in `blog/` folder — Astro setup, not deployed yet)
- [ ] E2E tests (in `e2e-tests/` — Playwright setup, not configured)

---

## Useful CLI Commands

```bash
# Check Railway backend status
railway status

# Watch Railway logs live
railway logs --tail 100

# Set Railway environment variable
railway variables --set "KEY=value"

# Apply database migrations
DIRECT_URL="..." DATABASE_URL="..." npx prisma migrate deploy

# Deploy Cloudflare Worker
cd cf-worker && wrangler deploy

# Local development
cd app && wasp start
```

---

*StockMart.lk — Built with Wasp + OpenSaaS. Deployed on Vercel + Railway. Domain via Cloudflare.*
