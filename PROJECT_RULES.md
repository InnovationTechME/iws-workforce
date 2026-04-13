# PROJECT_RULES.md

## Purpose

This file defines the operating rules for work on the IWS repository. It exists to keep the project stable, reviewable, and aligned with the real operational needs of Innovation Technologies LLC O.P.C.

## Core principle

IWS is a business-critical internal operations platform. Changes must be safe, auditable, and consistent with documented workforce, payroll, and compliance logic.

## Product boundaries

The platform covers:

- role-based login/access
- offers and onboarding
- worker records
- document management
- certification tracking
- HR inbox workflows
- attendance and absence
- timesheets and reconciliation
- payroll runs and approval stages
- payslips and payroll outputs
- leave and return logic
- warnings and letters
- blacklist checks
- offboarding and reactivation
- operational visibility across HR, Operations, Management, and Finance

## Stack rules

- Framework: Next.js App Router
- Language: JavaScript only unless explicitly approved otherwise
- Styling: Tailwind CSS plus current project conventions
- Backend target: Supabase
- Deployment: Vercel
- Avoid adding new frameworks unless clearly necessary
- Avoid state libraries unless the current architecture truly requires them
- Avoid introducing TypeScript midstream without explicit approval

## Change rules

### 1. Scope control
All work must be scoped.
Do not combine unrelated fixes in one change.
Do not “clean up” large areas opportunistically unless approved.

### 2. Incrementalism
Prefer small, reversible edits over sweeping refactors.

### 3. File discipline
Touch the minimum reasonable set of files.

### 4. Reuse
Prefer shared helpers/components over duplicated page logic.

### 5. No accidental redesigns
Do not change visual system, IA, navigation, core page patterns, or route structure unless explicitly requested.

## Business logic protection

The following areas are high-risk and must be handled carefully:

- payroll calculations
- worker category compensation rules
- leave eligibility
- salary hold behavior
- warning escalation
- absence deductions
- document expiry and renewal logic
- worker pack composition
- offboarding blockers
- approvals and lock states
- payment methods and WPS outputs

Any change touching these areas must reference existing business docs and explain impact.

## Data rules

- Do not invent fields lightly
- Do not rename fields lightly
- Do not change entity meaning without documenting it
- Keep UI labels, docs, and schema concepts aligned
- Treat worker, document, payroll, attendance, and leave records as audit-sensitive

## Migration rules

Schema-affecting changes must:
- be documented
- be migration-based
- preserve data integrity
- identify backwards compatibility concerns
- update `docs/data-model.md`

No silent schema drift.

## Dependency rules

Before adding a new dependency, ask:
- does the repo already have a way to do this?
- can this be solved with native browser/React/Next functionality?
- is the dependency stable and necessary?
- is it worth the long-term maintenance burden?

Default answer: do not add the dependency unless clearly justified.

## UI rules

- Keep operational screens clear and dense enough for admin use
- Prioritize clarity, status visibility, and actionability
- Avoid decorative redesigns
- Preserve badge/status semantics
- Preserve click-through flows for operational work
- Avoid fancy interactions that slow down repeat admin use

## Testing expectations

For every meaningful change, verify:
- target screen loads
- target action still works
- no obvious regression in related flows
- role-based visibility still makes sense
- edge cases are considered if business-critical

## Documentation rules

Documentation must stay in sync with implementation.
If behavior changes and docs are not updated, the task is incomplete.

## When uncertain

When uncertainty exists:
- choose the least destructive path
- preserve current behavior
- surface ambiguity clearly
- avoid fake certainty

## Repo truth hierarchy

1. `PROJECT_RULES.md`
2. approved business docs in `/docs`
3. current accepted implementation
4. task-specific instructions
5. agent-specific preferences

## Prohibited behavior

- broad unrequested rewrites
- undocumented schema changes
- dependency sprawl
- replacing business rules with generic HR defaults
- mixing many unrelated changes in one PR
- hiding assumptions
- pretending implementation is complete when it is partial
