# CampaignOPS AI Production Research And Architecture

Date researched: 2026-06-20

Source of truth boundary:

- Product scope remains governed by `CampaignOps Project Context.pdf`.
- This document is a technical architecture plan for implementing the locked AI features.
- It must not introduce product features outside the PDF; it only explains how to build the AI layer properly.

## Executive Position

CampaignOPS should not be built as a generic chatbot or a loose "AI agent".

The correct architecture is an AI-assisted operations system:

1. The database remains the source of truth.
2. AI workflows produce structured JSON.
3. Outputs are saved, editable, reviewable, and human-approved.
4. Approved outputs convert into normal app objects: tasks, budget items, outreach templates, content items, reports, and playbook entries.
5. Every AI action is tenant-scoped, role-gated, logged, evaluated, and eventually grounded in internal knowledge.

The AI layer should feel like an operations planner inside CampaignOPS, not like a chat window bolted onto the side.

## What Industry-Grade AI Apps Usually Do

### 1. They use structured outputs, not free-form text

Industrial systems do not let core workflows depend on plain paragraphs. They use JSON schemas or typed object schemas so model outputs can be validated, stored, displayed, edited, and converted into downstream records.

CampaignOPS implication:

- Every workflow gets a versioned schema.
- `EVENT_PLAN`, `BUDGET`, `TASKS`, `OUTREACH`, `CONTENT_CALENDAR`, `RISK_CHECKLIST`, and `REPORT` outputs must be typed.
- UI renders structured sections, not raw chat bubbles.
- API validates the output before saving.

### 2. They start with prompts and RAG before fine-tuning

For a product like CampaignOPS, most intelligence comes from:

- Event taxonomy
- Scale tiers
- Past events
- Budgets
- Vendor notes
- Outreach templates
- Post-event learnings
- Internal documents

This changes faster than a model should be retrained. The practical industry path is:

1. Prompt templates + structured output.
2. Retrieval augmented generation over internal knowledge.
3. Evaluation and feedback loops.
4. Fine-tuning only if repeated workflow behavior still fails after enough high-quality examples exist.

CampaignOPS implication:

- Do not fine-tune first.
- Build mock provider first.
- Then add an API provider.
- Then add RAG over uploaded files and playbooks.
- Later, consider model optimization only after eval data exists.

### 3. They separate "generation" from "action"

Industry-grade AI systems do not let models directly mutate business records without checks. AI produces a proposal; the application converts that proposal after user approval.

CampaignOPS implication:

- AI plan generation saves `AIOutput`.
- User reviews and accepts output.
- Accepted plan can later convert to Tasks/Budget/Outreach, but conversion is explicit.
- No auto-send, no auto-delete, no auto-budget mutation.

### 4. They evaluate outputs continuously

Production AI is not "ship prompt and pray". It has offline evals, online feedback, trace review, and regression checks.

CampaignOPS implication:

- Store prompt version, model, input JSON, output JSON, latency, and status in `AIWorkflowRun`.
- Store accepted/rejected/edited outputs in `AIOutput`.
- Use accepted human edits as future eval examples.
- Create a small eval dataset for each workflow before adding paid AI.

### 5. They use RAG for private knowledge

RAG systems chunk private documents, embed chunks, store vectors, retrieve relevant chunks at generation time, and pass the relevant context into the model.

CampaignOPS implication:

- `KnowledgeDocument` stores uploaded source docs.
- `KnowledgeChunk` or similar future table stores chunk text, metadata, embedding, organizationId, eventId, fileId, category.
- Retrieval must filter by organization and optionally event/category.
- Outputs must show `knownFromProvidedData`, `assumptions`, `needsConfirmation`, `confidenceLevel`, and later `sourcesUsed`.

### 6. They deploy AI as backend-owned infrastructure

The browser should never own AI provider keys or decide tenant rules. CampaignOPS already has a NestJS API with auth, RBAC, Prisma, activity logs, and event scoping. The AI layer should live there.

CampaignOPS implication:

- Next.js UI calls CampaignOPS API.
- NestJS API calls mock/OpenAI/other providers.
- API enforces role and event access.
- API logs and stores every AI run.
- API owns conversion workflows.

## CampaignOPS Target AI Architecture

```text
apps/web
  Event AI Plan tab
  AI Budget tab sections
  AI Outreach editor
  Saved AI outputs review UI
  Human approve/edit/convert controls

apps/api/src/ai
  ai.module.ts
  ai.controller.ts
  ai.service.ts
  providers/
    llm-provider.interface.ts
    mock-ai.provider.ts
    openai.provider.ts
  workflows/
    event-plan.workflow.ts
    budget.workflow.ts
    task-breakdown.workflow.ts
    outreach.workflow.ts
    content-calendar.workflow.ts
    risk-checklist.workflow.ts
    report.workflow.ts
  schemas/
    event-plan.schema.ts
    budget-output.schema.ts
    tasks-output.schema.ts
    outreach-output.schema.ts
  rag/
    document-ingestion.service.ts
    text-extraction.service.ts
    chunking.service.ts
    embedding.service.ts
    retrieval.service.ts
  evals/
    eval-runner.service.ts
    fixtures/
```

## Data Flow

### Generate

1. User clicks Generate in an event workspace.
2. API checks JWT, organization, event access, and role.
3. API builds workflow input from the event record, contacts, vendors, budget, tasks, files, and later retrieval context.
4. Provider returns strict structured JSON.
5. API saves:
   - `AIWorkflowRun.inputJson`
   - `AIWorkflowRun.outputJson`
   - `AIWorkflowRun.modelUsed`
   - `AIWorkflowRun.status`
   - `AIOutput.responseJson`
6. API records activity log.
7. UI renders structured sections.

### Review

1. User reads the AI output.
2. User edits JSON or structured fields.
3. API saves edited output.
4. User approves output.
5. API sets `isAccepted = true`.
6. API records activity log.

### Convert

1. User chooses Convert to Tasks/Budget/Outreach/etc.
2. API validates accepted output schema.
3. API creates app records in a transaction.
4. API records activity logs.
5. AI output remains traceable as the source.

## Provider Strategy

### Stage 1: Mock Provider

Use deterministic code-generated JSON.

Why:

- Zero cost.
- Predictable tests.
- Lets UI, database, RBAC, approval, conversion, and logs mature before paid AI.

### Stage 2: External Provider Adapter

Add `OpenAIProvider` or equivalent behind `LlmProvider`.

Rules:

- Provider keys only in API environment variables.
- Never expose provider keys in Next.js.
- Use schema-constrained generation for all core workflows.
- Store model name and prompt version.
- Add timeout, retry, refusal handling, and failure status.

### Stage 3: Provider Routing

Only after stable workflows:

- Cheap model for drafts.
- Strong model for event plan/report reasoning.
- Embedding model for RAG.
- Fallback provider only if needed.

Vercel AI SDK can be useful as a TypeScript abstraction, especially if we later use Vercel AI Gateway or streaming UI, but CampaignOPS should still keep provider execution in the backend because the backend owns tenant access, audit logs, and conversion rules.

## RAG / Knowledge Plan

Do not implement RAG before Phase 4. Prepare the architecture now so Phase 4 is clean.

### Ingestion

1. User uploads file.
2. File is stored in object storage.
3. API creates `KnowledgeDocument`.
4. Worker extracts text.
5. Worker chunks text.
6. Worker embeds chunks.
7. Chunks are stored with organization/event/category metadata.

### Retrieval

1. Workflow defines retrieval query.
2. Retrieval filters by organizationId.
3. Event-specific workflow can filter by eventId or event category.
4. Top chunks are added as `retrievedContextJson`.
5. AI output includes source references.

### Storage Choice

For CampaignOPS, start with PostgreSQL + pgvector when Phase 4 begins.

Why:

- We already use PostgreSQL and Prisma.
- Tenant filters are easier to enforce in one database.
- Operational complexity stays lower than adding a separate vector database too early.

Move to Pinecone or another vector DB only if:

- Vector volume becomes large.
- Retrieval latency becomes a problem.
- Dedicated vector operations become operationally worth it.

## Evaluation Plan

### Offline Evals

Create JSONL fixtures for:

- Event plan generation
- Budget suggestions
- Task breakdown
- Outreach drafts
- Content calendar
- Risk checklist

Each eval row should include:

- Event input
- Expected schema validity
- Expected safety properties
- Rubric checks
- Optional reference output

Minimum checks:

- Valid JSON schema
- No invented government officer names
- No invented vendor names
- No exact legal claims unless supplied
- Includes assumptions
- Includes needs confirmation
- Uses provided event type/scale/timeline/budget
- Produces actionable operational sections

### Online Evals

Track:

- Generated vs accepted
- Edited before approval
- Rejected outputs
- Conversion success
- User feedback
- Latency
- token/cost when paid provider is enabled

### Human Review

Human approval is not optional in CampaignOPS. It is the product safety boundary.

## Security And RBAC

AI must follow the same security model as every existing module.

Rules:

- Admin/Manager can generate/edit/approve/convert AI outputs.
- Member can view accepted and draft outputs if they can access the event.
- All AI endpoints must check event ownership.
- Direct URL changes must not leak other org/event data.
- AI outputs must not bypass task/budget/vendor/contact permissions.
- Every AI generate/edit/accept/convert action must create activity logs.
- Provider keys stay server-side.
- Uploaded files must not be public by default.

## Deployment Architecture

### Recommended MVP Deployment

```text
Vercel
  apps/web - Next.js frontend

Render
  apps/api - NestJS API
  optional worker - background jobs later
  PostgreSQL - app database

Object storage
  S3 / Cloudflare R2 / Render disk only for temporary early deployments

AI provider
  Mock provider first
  OpenAI/other provider later through API only
```

### Why split web and API

- Next.js frontend deploys cleanly on Vercel.
- NestJS long-running API fits Render better.
- File uploads, AI calls, migrations, and future workers are simpler outside serverless limits.
- API can bind to Render's `PORT` and talk to Render Postgres over private/internal networking.

### Required Environment Variables

Web:

- `NEXT_PUBLIC_API_URL`

API:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `WEB_ORIGINS`
- `AI_PROVIDER`
- `OPENAI_API_KEY` later
- `FILE_STORAGE_DRIVER` later
- `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` later

### Production Readiness Before Public Use

- Replace local file storage with object storage.
- Add Prisma migrate deploy command.
- Add seed/admin bootstrap policy.
- Add health checks.
- Add CORS for deployed web URL only.
- Rotate JWT secrets.
- Add API request logging.
- Add AI workflow latency/error logging.
- Add rate limits on AI endpoints.
- Add provider cost ceilings and usage dashboards.
- Add backup policy for PostgreSQL.

## Implementation Roadmap From Here

### Slice 1: Mock AI Event Planner

Build now:

- `apps/api/src/ai`
- Mock provider
- Event plan workflow
- `GET /events/:eventId/ai-outputs`
- `POST /events/:eventId/ai/event-plan`
- `PATCH /events/:eventId/ai-outputs/:id`
- `PATCH /events/:eventId/ai-outputs/:id/accept`
- AI Plan tab
- Edit JSON
- Approve output
- Activity logs

### Slice 2: AI Budget Estimator

- Structured budget JSON.
- Saved output.
- Human approval.
- Later conversion to budget line items.

### Slice 3: AI Outreach Writer

- Structured drafts by recipient type.
- Saved output.
- Human approval.
- Later conversion to outreach templates.

### Slice 4: AI Task Breakdown

- Structured tasks.
- Deadlines and priorities.
- Human approval.
- Later conversion to tasks.

### Slice 5: Conversion Workflows

- Convert accepted AI output into normal app records.
- Always explicit user action.
- Always transactional.
- Always logged.

### Slice 6: Post-event Debrief And Playbook Entries

- Capture what happened.
- Save lessons.
- Feed future intelligence.

### Slice 7: RAG / Knowledge Base

- Text extraction.
- Chunking.
- Embeddings.
- pgvector.
- Retrieval.
- Source-grounded AI outputs.

## What We Should Not Do

- Do not build a generic chatbot as the main AI surface.
- Do not expose provider keys in frontend.
- Do not let AI directly mutate app records without approval.
- Do not fine-tune before we have accepted/rejected examples.
- Do not add Redis/BullMQ/Kafka/microservices yet; these are outside the locked MVP unless explicitly requested.
- Do not let AI invent government officer names, vendor names, legal requirements, exact rates, permissions, or sponsor commitments.

## References

- OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI Evals: https://developers.openai.com/api/docs/guides/evals
- OpenAI Model Optimization: https://developers.openai.com/api/docs/guides/model-optimization
- OpenAI Production Best Practices: https://developers.openai.com/api/docs/guides/production-best-practices
- OpenAI Deployment Checklist: https://developers.openai.com/api/docs/guides/deployment-checklist
- OpenAI File Search / Retrieval: https://developers.openai.com/api/docs/guides/tools-file-search
- Google Gen AI Evaluation: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/evaluation-overview
- LangSmith Evaluation Concepts: https://docs.langchain.com/langsmith/evaluation-concepts
- Pinecone RAG Guide: https://docs.pinecone.io/guides/get-started/build-a-rag-chatbot
- Vercel AI SDK: https://ai-sdk.dev/docs/introduction
- Vercel Next.js Deployment: https://vercel.com/docs/frameworks/full-stack/nextjs
- Vercel Environment Variables: https://vercel.com/docs/environment-variables
- Render Web Services: https://render.com/docs/web-services
- Render Postgres: https://render.com/docs/postgresql-creating-connecting
