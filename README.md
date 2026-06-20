# CampaignOps

CampaignOps is an AI-assisted event and campaign operations platform.

The single source of truth for product scope is:

`CampaignOps Project Context.pdf`

Follow the docs in `docs/` before changing product scope or implementation direction.

## Local Commands

```bash
pnpm install
pnpm dev
```

Run web only:

```bash
pnpm dev:web
```

Run API only:

```bash
pnpm dev:api
```

Start local PostgreSQL:

```bash
docker compose up -d postgres
```

Generate Prisma client:

```bash
pnpm prisma:generate
```

## Structure

```text
apps/web       Next.js App Router frontend
apps/api       NestJS REST API
packages/shared Shared TypeScript constants, schemas, and types
prisma         Prisma schema and seed entry
docs           PDF-derived product lock
references     Non-authoritative references unless explicitly approved
```

