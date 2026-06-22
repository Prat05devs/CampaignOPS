# CampaignOps Deployment Runbook

This app is a pnpm monorepo:

- `apps/web`: Next.js frontend
- `apps/api`: NestJS REST API
- `prisma`: PostgreSQL schema and migrations
- `packages/shared`: shared TypeScript package

Recommended first production setup:

- Frontend: Vercel
- Backend: Render web service
- Database: Render PostgreSQL or Neon PostgreSQL
- Docker: local development only for now

## Why Not Docker For The First Deployment?

Docker Compose is useful locally because it gives us PostgreSQL without installing Postgres on the machine.

For production, Vercel does not run our backend container, and Render can run Node apps directly. A direct Node deployment is simpler for this MVP:

- Vercel builds and hosts the Next.js app.
- Render builds and hosts the NestJS API.
- Managed Postgres stores production data.
- Prisma migrations run during the API deploy.

Later, if we need stricter infrastructure parity, we can add a production Dockerfile for the API.

## Production Environment Variables

API service:

```bash
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
WEB_ORIGINS=https://your-web-domain.vercel.app
```

Web service:

```bash
NEXT_PUBLIC_API_URL=https://your-api-domain.onrender.com/api
```

Generate strong JWT secrets locally:

```bash
openssl rand -base64 48
```

Use two different values for access and refresh secrets.

## Deploy Backend On Render

Option A: Render Blueprint

1. Push `render.yaml` to GitHub.
2. In Render, choose **Blueprints**.
3. Connect the `CampaignOPS` repository.
4. Render will create:
   - `campaignops-api`
   - `campaignops-postgres`
5. Add these secret environment variables when Render asks:
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `WEB_ORIGINS`

Set `WEB_ORIGINS` after the Vercel app exists. During the first deploy you can temporarily use:

```bash
WEB_ORIGINS=http://localhost:3001
```

Then replace it with the Vercel URL and redeploy the API.

Option B: Manual Render Web Service

1. Create a PostgreSQL database in Render.
2. Create a Web Service from the GitHub repository.
3. Use:

```bash
Build Command:
corepack enable && corepack prepare pnpm@10.22.0 --activate && pnpm install --frozen-lockfile && pnpm deploy:api:build

Start Command:
pnpm start:api
```

4. Add API environment variables listed above.

The API deploy build runs:

```bash
pnpm prisma:generate
pnpm prisma:migrate:deploy
pnpm --filter @campaignops/api build
```

## Deploy Frontend On Vercel

Create a new Vercel project from the same GitHub repository.

Recommended Vercel settings:

```bash
Framework Preset:
Next.js

Root Directory:
apps/web

Install Command:
cd ../.. && pnpm install --frozen-lockfile

Build Command:
cd ../.. && pnpm deploy:web:build

Output Directory:
.next
```

Environment variable:

```bash
NEXT_PUBLIC_API_URL=https://your-api-domain.onrender.com/api
```

If Vercel shows a platform-level `404: NOT_FOUND`, check that the project root is `apps/web`, not `apps/api` and not the repository root.

The commands above intentionally step back to the repository root because the monorepo build needs:

- root `package.json`
- `pnpm-workspace.yaml`
- `packages/shared`
- `prisma/schema.prisma`

Avoid this setup unless Vercel support specifically asks for it:

```bash
Root Directory:
.

Build Command:
pnpm deploy:web:build

Output Directory:
apps/web/.next
```

## Post-Deploy Smoke Test

After both services are live:

1. Visit the API health URL:

```bash
https://your-api-domain.onrender.com/api/health
```

Expected response:

```json
{"status":"ok"}
```

2. Visit the Vercel URL.
3. Sign up a test admin user.
4. Create a sample event.
5. Open the event command centre.
6. Generate a mock AI plan.
7. Approve the AI output and convert it to tasks.
8. Visit `/tasks` and confirm the converted tasks appear.

## Current Production Caveats

File uploads currently use local API filesystem storage. This is okay for local demos, but production uploads should move to durable object storage such as S3, Cloudflare R2, or Render persistent disk.

Do not seed production with local demo data unless you intentionally want public demo records.

## Useful Commands

Local development:

```bash
pnpm dev
```

Run all checks:

```bash
pnpm typecheck
pnpm build
```

Production migration only:

```bash
pnpm prisma:migrate:deploy
```

Production API build:

```bash
pnpm deploy:api:build
```

Production web build:

```bash
pnpm deploy:web:build
```
