# IWS — Innovation Workforce System

Internal workforce operations platform for Innovation Technologies LLC O.P.C.

IWS is a Next.js-based HR, workforce, documents, attendance, timesheets, payroll, and compliance platform built for an industrial manpower business operating in Abu Dhabi, UAE. The system is designed around real operational workflows: hiring, onboarding, worker file management, document expiry tracking, attendance, disciplinary actions, payroll approval, payslip distribution, leave, offboarding, and auditability.

## Current status

- Frontend application is built in Next.js App Router
- Styling uses Tailwind CSS
- Current deployment runs on Vercel
- Supabase client dependency is installed in the repo
- Historical system documentation states the platform began on a mock/in-memory data layer before migration to Supabase
- This repository is the active source of truth for the application codebase

## Business purpose

The platform supports the workforce lifecycle for Innovation Technologies LLC O.P.C., including:

- offers and onboarding
- worker records and profiles
- document management and expiry tracking
- certifications and renewals
- attendance and absence logging
- timesheet import and reconciliation
- payroll calculation and approval workflow
- payslip generation and distribution
- leave requests and salary hold logic
- disciplinary warnings and letters
- offboarding and closure checklists
- blacklist checks and compliance workflows

## Stack

Confirmed from repository:

- Next.js 14.2.35
- React 18
- Tailwind CSS 3.4.1
- Supabase JS client
- XLSX import/export support
- jsPDF + jsPDF AutoTable
- JSZip
- Plain JavaScript, not TypeScript

## Repository principles

This repo follows a strict rule:

1. Business truth lives in `/docs`
2. Project status lives in `CURRENT_STATE.md`
3. Work queue lives in `TASKS.md`
4. Implementation constraints live in `PROJECT_RULES.md`
5. Agent behavior starts from `AGENTS.md`
6. Claude-specific instructions are secondary and must not contradict root project docs

If any instruction file conflicts with business docs or project rules, follow this order:

1. `PROJECT_RULES.md`
2. `/docs/business-rules.md`
3. `/docs/workflows.md`
4. `/docs/data-model.md`
5. `CURRENT_STATE.md`
6. `TASKS.md`
7. `AGENTS.md`
8. `.claude/project-instructions.md`

## Local development

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build production bundle:

```bash
npm run build
```

Start production build locally:

```bash
npm run start
```

Lint:

```bash
npm run lint
```

## Environment variables

Expected environment variables for Supabase-enabled operation:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Never commit secrets to the repository.

## Key documents to read before coding

Every developer or coding agent must read these before making broad changes:

- `AGENTS.md`
- `PROJECT_RULES.md`
- `CURRENT_STATE.md`
- `TASKS.md`
- `ARCHITECTURE.md`
- `docs/business-rules.md`
- `docs/workflows.md`
- `docs/data-model.md`

## Main product areas

- Dashboard
- Offers
- Onboarding
- Workers
- Worker Detail
- Documents
- Certifications
- Warnings
- Leave
- Attendance
- Timesheets
- Payroll
- Payroll Run Wizard
- Packs
- Inbox
- Offboarding
- Blacklist
- Pending Approvals

These modules are reflected in prior internal project documentation and should be preserved unless an approved structural change is documented.

## Working method

Every feature or fix should follow this flow:

1. Confirm scope in `TASKS.md`
2. Check related business logic in `/docs`
3. Make smallest safe change possible
4. Avoid broad redesigns
5. Test affected flows
6. Update docs if business logic or data shape changed
7. Open PR with clear summary and touched files

## Warning

This is not a generic HR SaaS demo.

This product encodes company-specific logic for:
- UAE manpower operations
- document and certification compliance
- payroll rules by worker category
- leave eligibility and salary hold
- warnings and deduction flows
- worker packs and operational controls

Do not replace business-specific logic with generic SaaS assumptions.

## Maintainers

Innovation Technologies LLC O.P.C.
Internal project repository for IWS development.
