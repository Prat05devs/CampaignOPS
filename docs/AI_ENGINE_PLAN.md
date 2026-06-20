# CampaignOps AI Engine Plan

## Direction

We are not building a base LLM from scratch.

We are building the CampaignOps AI Engine by using an existing LLM API as the reasoning layer and building domain-specific intelligence around it.

The AI engine should combine:

- Existing LLM API
- Structured prompts
- JSON output schemas
- Event taxonomy
- Budget patterns
- Company knowledge
- Past event playbooks
- Vendor notes
- RAG later
- Human approval
- Action conversion

## AI Philosophy

- LLM = reasoning/writing layer
- RAG = company memory
- Database = source of truth
- Prompt templates = process
- Structured outputs = discipline
- Tools/actions = execution
- Human review = safety

## AI Output Rule

Every core AI workflow must return structured JSON.

Do not use plain chatbot text for core workflows.

AI output must be:

- Saved in the database
- Reviewable
- Editable
- Convertible into app objects

Conversions:

- Task checklist -> Tasks
- Budget split -> Budget items
- Vendor requirements -> Vendor checklist
- Outreach drafts -> Templates
- Content plan -> Content calendar
- Risks -> Risk log
- Event flow -> Event schedule
- Report structure -> Report draft

## Core AI Workflows

- AI Event Plan Generator
- AI Strategy Builder
- AI Budget Planner
- AI Task Breakdown Generator
- AI Outreach Generator
- AI Content Calendar Generator
- AI Risk Checklist Generator
- AI Proposal Generator later
- AI Post-Event Report Generator

## AI Event Plan Generator

Input:

- Event type
- Subtype
- City
- Venue
- Budget
- Expected pax
- Timeline
- Stakeholders
- Dignitary/protocol
- Objective

Output:

- Strategy summary
- Event flow
- Minute-to-minute schedule
- Manpower plan
- Vendor requirements
- Logistics checklist
- Stage/stall requirements
- Media coverage plan
- Risk checklist
- Post-event report structure

## AI Budget Planner

Input:

- Event type
- Scale
- City
- Budget
- Expected pax
- Timeline

Output:

- Category-wise budget
- Must-have expenses
- Optional expenses
- Savings suggestions
- Risk of under-budgeting
- Notes based on past events

## AI Task Breakdown Generator

Input:

- Accepted event plan
- Event date
- Team size
- Departments involved

Output:

- Phase-wise tasks
- Deadlines
- Departments
- Priorities
- Suggested owners
- Event-day checklist
- Post-event checklist

## AI Outreach Generator

Input:

- Recipient type
- Event context
- Tone
- Objective

Output:

- Email
- WhatsApp message
- Call script
- Follow-up message
- Sponsorship request
- Government letter
- Press release
- Thank-you note

## AI Content Calendar Generator

Input:

- Event type
- Audience
- Date
- Platforms
- Tone

Output:

- 7-day / 15-day / 30-day content calendar
- Caption drafts
- Reel ideas
- Poster text
- LinkedIn post drafts
- WhatsApp broadcast drafts

## AI Safety / Hallucination Rules

AI must not invent:

- Government officer names
- Vendor names
- Exact rates
- Legal requirements
- Confirmed permissions
- Sponsor commitments
- Official claims

If data is unavailable, AI must say:

`Not available in current knowledge base.`

AI outputs must include:

- Known from provided data
- Assumptions
- Needs confirmation
- Confidence level
- Sources used later when RAG is active

No auto-send in MVP. AI can draft messages, but the user must manually approve and send.

## RAG / Knowledge Base Direction

Before AI answers, the system searches internal knowledge such as:

- Past event plans
- Proposals
- Rate cards
- Budgets
- Vendor notes
- Government letters
- Outreach templates
- Post-event reports
- Playbooks
- Department notes

Relevant information is then given to the LLM so the output becomes specific to the company.

## RAG Build Stages

Stage 1: No RAG

- Structured AI with mock provider
- Template-based JSON outputs

Stage 2: Seeded knowledge

- Manually store event categories, budget ranges, department notes, and execution rules

Stage 3: RAG v1

- Upload PDFs/DOCX
- Extract text
- Chunk text
- Generate embeddings
- Store in PostgreSQL with pgvector
- Retrieve relevant chunks during AI generation

Stage 4: Learning loop

- Post-event debriefs create playbook entries
- Vendor notes and budget actuals improve future outputs

## Knowledge / Playbook Features

- Playbook library
- Playbook detail
- Knowledge base search
- Post-event debrief
- Event learnings
- Budget pattern library
- Vendor notes library
- Outreach template library

## AI Module Architecture

```text
apps/api/src/ai/
  ai.module.ts
  ai.controller.ts
  ai.service.ts
  providers/
    llm-provider.interface.ts
    mock-ai.provider.ts
    openai.provider.ts
  workflows/
    event-plan.workflow.ts
    strategy.workflow.ts
    budget.workflow.ts
    outreach.workflow.ts
    content-calendar.workflow.ts
    risk-checklist.workflow.ts
    debrief.workflow.ts
  rag/
    document-ingestion.service.ts
    chunking.service.ts
    embedding.service.ts
    retrieval.service.ts
  prompts/
    system-prompts.ts
    event-plan.prompt.ts
    budget.prompt.ts
    outreach.prompt.ts
    report.prompt.ts
  schemas/
    event-plan.schema.ts
    budget-output.schema.ts
    outreach-output.schema.ts
```

Start with mock AI provider. Do not require paid AI API for the initial MVP.

