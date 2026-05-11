# Deployment checklist

## Neon

1. Create a new Neon project only for this app.
2. Copy the pooled PostgreSQL connection string.
3. Keep it secret.
4. Do not reuse HisabDost/ProBiz database URLs.

## Local commands before Vercel

```bash
npm install
DATABASE_URL='YOUR_NEON_DATABASE_URL' npm run db:push
DATABASE_URL='YOUR_NEON_DATABASE_URL' npm run db:seed
```

## Vercel

Create one project only.

Environment variables:

```env
DATABASE_URL=your_neon_postgres_url
JWT_SECRET=your_generated_secret
APP_URL=https://your-vercel-domain.vercel.app
FBR_MODE=mock
AI_PROVIDER=mock
```

Health check:

```txt
/api/health
```

Login:

```txt
owner@probiz.ai / Probiz01
```
