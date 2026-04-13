# AGENTS.md

This file is the entry point for any coding agent working in this repository.

## Mission

Help maintain and extend IWS — Innovation Workforce System — safely, incrementally, and in alignment with real business workflows for Innovation Technologies LLC O.P.C.

## Read first

Before changing code, read in this exact order:

1. `PROJECT_RULES.md`
2. `CURRENT_STATE.md`
3. `TASKS.md`
4. `ARCHITECTURE.md`
5. `docs/business-rules.md`
6. `docs/workflows.md`
7. `docs/data-model.md`
8. `docs/db-migrations-policy.md`
9. `docs/ui-patterns.md`
10. `.claude/project-instructions.md` if using Claude Code

## Non-negotiable rules

- Do not perform broad redesigns unless explicitly requested
- Do not replace business-specific logic with generic templates
- Do not invent business rules when docs already define them
- Do not introduce new dependencies casually
- Do not change schema without a migration plan
- Do not rename major routes, domains, or entities casually
- Do not duplicate page logic when a shared component is more appropriate
- Do not remove auditability from approvals, deductions, payroll, or worker file actions
- Do not hide assumptions; state them explicitly

## How to work in this repo

When implementing a task:

1. Identify the exact affected business area
2. Read the relevant business and workflow docs
3. Inspect current implementation
4. Make the smallest safe change
5. Keep touched files limited and intentional
6. Preserve current behavior outside the requested scope
7. Note assumptions, risks, and follow-up work

## Required output when proposing a code change

Every meaningful change proposal should include:

- summary of what is being changed
- why it is being changed
- touched files
- business rule references
- whether schema changes are required
- whether seed/mock/test data must also be updated
- whether deployment or environment changes are required
- risks or edge cases

## Priority order when making decisions

When several “good” choices exist, prefer the option that is:

1. safest
2. easiest to review
3. easiest to roll back
4. consistent with existing app patterns
5. aligned with documented business rules

## What this system is

This system is for:
- workforce operations
- HR administration
- documents and expiry tracking
- payroll processing
- attendance and timesheet reconciliation
- warning and approval flows
- offboarding control
- compliance-driven worker records

This system is not:
- a generic HR startup template
- a consumer app
- an experimental AI playground
- a place for uncontrolled architectural rewrites

## Documentation discipline

If you change:
- business logic -> update `docs/business-rules.md`
- workflow behavior -> update `docs/workflows.md`
- data shape -> update `docs/data-model.md`
- migration policy -> update `docs/db-migrations-policy.md`
- UI behavior pattern -> update `docs/ui-patterns.md`
- current project status -> update `CURRENT_STATE.md`
- task completion state -> update `TASKS.md`

## Migration discipline

If a change affects persistence or schema:
- create or update migration documentation
- do not apply undocumented schema drift
- ensure UI fields and business docs stay aligned
- ensure existing payroll/document logic is preserved

## PR discipline

Every PR should:
- be scoped
- have a clear title
- explain why the change is needed
- list touched files
- note any migration requirements
- note any manual test steps
- avoid unrelated cleanup unless necessary

## If documentation and code disagree

Do not guess.

Use this priority:
1. `PROJECT_RULES.md`
2. approved business docs
3. current live implementation behavior
4. open task scope

If still unclear, preserve current behavior and flag the ambiguity.
