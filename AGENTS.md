# CampaignOps Agent Rules

## Single Source Of Truth

The only authoritative product source is:

`/Users/prateekthapliyal/Downloads/CampaignOPS/CampaignOps Project Context.pdf`

PDF SHA-256:

`636e58c58df1fdff905a7638160a7df2180e57f1ab1b1fc7e80ce542092e102a`

The files in `docs/` are a working lock derived from that PDF. If any derived doc conflicts with the PDF, the PDF wins.

Per user instruction on 2026-06-13: do not use the other Downloads files, Figma screens, HTML mockups, DOCX files, or images as requirements unless the user explicitly asks. They are non-authoritative.

## Product Identity

CampaignOps is an AI-assisted event and campaign operations platform. It is an internal operating system for planning, executing, tracking, and learning from events and campaigns.

It is not only:

- An AI dashboard
- An event management tool
- A CRM
- A chatbot
- A task manager

Use this positioning:

> CampaignOps is an AI-assisted event and campaign operations system that converts event requirements into execution plans using event taxonomy, scale tiers, budget patterns, stakeholder context, and reusable organizational knowledge.

## Non-Negotiable Scope Rules

- Do not add features outside the locked MVP feature list unless explicitly asked.
- Do not implement future/backlog items unless explicitly asked.
- AI is one intelligent layer inside the product, not the whole product.
- AI outputs must be structured JSON for core workflows.
- AI outputs must be saved, reviewable, editable, and human-approved.
- No AI output is final without human approval.
- No auto-send in MVP.
- Use mock AI first. Do not block MVP on paid AI APIs.

## Locked Stack

- TypeScript everywhere
- Next.js App Router frontend
- Tailwind CSS with inline utility classes
- Shadcn UI structure
- TanStack Query for server state
- Zustand for client/UI state only
- React Hook Form for form state
- Zod for validation
- NestJS modular monolith backend
- REST APIs
- PostgreSQL
- Prisma ORM
- Docker Compose for local PostgreSQL
- pnpm workspace

## Styling Rules

- Use inline Tailwind classes in JSX/TSX.
- Do not create CSS modules.
- Do not create component-level CSS files.
- One global CSS file is allowed only for Tailwind setup and Shadcn/theme tokens.
- UI direction: premium Himalayan event operations command centre.

## Working Method

Do not ask for or attempt "build the full app" in one pass. Work in small tasks.

Correct first production task:

Set up the monorepo foundation only:

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

