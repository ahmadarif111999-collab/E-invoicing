# FBR Digital Invoicing SaaS

A clean single-app Next.js SaaS foundation for Pakistani digital invoicing workflows.

This version intentionally avoids a separate frontend/backend Vercel split. It deploys as one Vercel project with Next.js API routes, which makes the URL setup much simpler:

- Frontend: same Vercel app
- Backend API: same Vercel app under `/api/*`
- Database: Neon PostgreSQL
- FBR mode: mock by default
- AI mode: mock by default

## Features

- Login with secure HTTP-only cookie JWT
- Multi-tenant firm and business foundation
- Role-aware business access
- Invoice creation with controlled backend numbering
- HS/PCT code search and automatic suggestions
- Manual HS/PCT override per invoice line
- Mock FBR submission with validation history
- Audit logs
- Sales/tax reports
- Neon PostgreSQL + Prisma schema
- Seed data, including HS/PCT rows extracted from the provided Pakistan Customs Tariff PDF

## Important compliance boundary

This software is FBR-ready architecture, not a certified FBR production integration.

Mock mode does not submit anything to FBR. Real production requires official access through the permitted FBR/PRAL/licensed-integrator route and legal/tax review.

The HS/PCT code assistant provides suggestions only. Classification must be reviewed by a qualified person. The CD% field is customs duty reference from the tariff source, not sales tax.

## Local setup

```bash
cp .env.example .env
```

For local PostgreSQL:

```bash
docker compose up -d
```

Use this local DATABASE_URL in `.env`:

```env
DATABASE_URL="postgresql://fbr_user:fbr_password@localhost:5433/fbr_invoicing?schema=public"
JWT_SECRET="replace-with-openssl-rand-base64-32"
APP_URL="http://localhost:3000"
FBR_MODE="mock"
AI_PROVIDER="mock"
```

Install and seed:

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Open:

```txt
http://localhost:3000
```

Seed login:

```txt
owner@probiz.ai
Probiz01
```

## Vercel deployment

Create **one Vercel project** from this repo.

Do not create a separate API project.
Do not create a separate frontend project.
Do not set a root directory.

Use these settings:

```txt
Framework Preset: Next.js
Root Directory: ./
Install Command: npm install
Build Command: npm run build
Output Directory: .next
```

Environment variables in Vercel:

```env
DATABASE_URL=your_neon_postgres_url
JWT_SECRET=generate_with_openssl_rand_base64_32
APP_URL=https://your-vercel-app.vercel.app
FBR_MODE=mock
AI_PROVIDER=mock
```

Generate JWT secret:

```bash
openssl rand -base64 32
```

After setting Neon URL, push schema and seed from your Mac:

```bash
DATABASE_URL='YOUR_NEON_DATABASE_URL' npm run db:push
DATABASE_URL='YOUR_NEON_DATABASE_URL' npm run db:seed
```

Then redeploy on Vercel.

Test API:

```txt
https://your-vercel-app.vercel.app/api/health
```

Test login:

```txt
https://your-vercel-app.vercel.app/login
```

## Recommended Git flow

```bash
git init
git add .
git commit -m "Initial FBR digital invoicing SaaS"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```
