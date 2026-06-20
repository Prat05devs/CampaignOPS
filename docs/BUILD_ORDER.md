# CampaignOps Build Order

Do not build everything at once. Follow this order.

## Phase 1: Foundation

Goal: It works.

Build:

- pnpm monorepo
- Next.js frontend
- NestJS backend
- shared package
- PostgreSQL Docker setup
- Prisma setup
- Tailwind setup
- Shadcn-ready structure
- Auth
- Roles
- Organization setup
- Event create form
- Event list
- Simple dashboard

## Phase 2: Operations

Goal: You can actually run an event in it.

Build:

- Event command centre
- Task board
- Timeline/checklist
- Budget line items
- Vendor/contact CRM
- Outreach drafts
- File uploads
- Activity logs
- Basic analytics cards

## Phase 3: Intelligence

Goal: It learns from your work.

Build:

- Mock AI event planner
- AI budget estimator
- AI outreach writer
- AI task breakdown
- Save AI outputs
- Convert AI outputs into tasks/budgets/templates
- Post-event debrief
- Playbook entries

## Phase 4: RAG / Knowledge

Goal: AI uses internal knowledge.

Build:

- Knowledge document upload
- Text extraction
- Chunking
- Embeddings
- pgvector
- Retrieval
- Source-based AI output

## Phase 5: Growth

Future only:

- Client portal
- Multi-org SaaS
- Vendor marketplace
- Billing
- White-label
- QR check-in
- Mobile app

## First Codex Task

First production task should only set up the project foundation:

- pnpm monorepo
- Next.js app in `apps/web`
- NestJS API in `apps/api`
- shared package in `packages/shared`
- PostgreSQL + Prisma setup
- Docker Compose for local database
- Tailwind configured in Next.js
- Shadcn-ready structure
- Zustand, TanStack Query, React Hook Form, and Zod installed
- inline Tailwind only
- no separate CSS module/component CSS files

Do not implement full features yet. Only create the clean foundation and explain the folder structure after setup.

