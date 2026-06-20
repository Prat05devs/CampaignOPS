# CampaignOps Tech Stack

Use this locked stack.

## Language

- TypeScript everywhere

## Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS with inline utility classes
- Shadcn UI
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Recharts later

## Backend

- NestJS
- Node.js runtime
- TypeScript
- REST APIs
- DTO validation
- Guards
- Services
- Controllers
- Modules
- Role-based access control
- JWT authentication

## Database

- PostgreSQL
- Prisma ORM
- Docker PostgreSQL locally
- Neon Postgres later for deployment

## AI

- Mock AI provider first
- Real LLM provider later
- Structured JSON outputs only
- RAG later using pgvector

## DevOps

- pnpm workspace
- Docker Compose
- GitHub
- GitHub Actions later
- Vercel for frontend later
- Render/Railway/Fly.io/EC2 for backend later

## State Management Rules

Use:

- TanStack Query = server state
- Zustand = client/UI state
- React Hook Form = form state
- Zod = validation

Use Zustand for:

- Sidebar collapsed/open
- Active workspace
- Active event
- Dashboard filters
- Event type filters
- Modal state
- Command palette state later
- Theme preference
- Temporary wizard UI state before final submit

Do not use Zustand for backend/server data like all events, tasks, budgets, vendors, leads, and AI outputs.

Use TanStack Query for API data.

## Styling Rules

Use inline Tailwind CSS classes inside components.

Allowed:

- One global CSS file for Tailwind setup and Shadcn/theme tokens only

Do not create:

- Separate CSS modules
- Component-level CSS files
- Separate CSS folders for page styling

## Recommended Monorepo Structure

```text
campaignops/
  apps/
    web/
      app/
      components/
      features/
      lib/
      hooks/
      stores/
    api/
      src/
        auth/
        users/
        organizations/
        events/
        tasks/
        budgets/
        contacts/
        vendors/
        outreach/
        files/
        ai/
        activity/
        reports/
        prisma/
  packages/
    shared/
      src/
        types/
        schemas/
        constants/
  prisma/
    schema.prisma
    seed.ts
  docs/
    PRODUCT_CONTEXT.md
    FEATURE_LOCK.md
    TECH_STACK.md
    AI_ENGINE_PLAN.md
    UX_UI_DIRECTION.md
    BUILD_ORDER.md
  references/
    dashboard_mockup.html
    full_feature_map.html
    new_event_wizard.html
    uttarakhand_event_knowledge_base.html
  docker-compose.yml
  pnpm-workspace.yaml
  package.json
  README.md
  AGENTS.md
```

## Backend Architecture

Use NestJS as a modular monolith first.

Do not start with microservices.

Modules:

- auth
- users
- organizations
- events
- tasks
- budgets
- contacts
- vendors
- outreach
- files
- ai
- activity
- reports

Microservices are future only. Do not build microservices in MVP.

## Important Database Models

Create Prisma models for MVP around:

- User
- Organization
- OrganizationMember
- Event
- Task
- Contact
- Vendor
- BudgetItem
- ContentItem
- FileAsset
- OutreachTemplate
- AIWorkflowRun
- AIOutput
- ActivityLog
- PlaybookEntry later
- KnowledgeDocument later
- KnowledgeChunk later

AI-related models:

- AIWorkflowRun
- AIOutput
- PromptTemplate
- KnowledgeDocument
- KnowledgeChunk
- PlaybookEntry

