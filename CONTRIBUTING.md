# CONTRIBUTING.md

## Purpose

This file explains how to contribute safely to the IWS repository.

## Before you start

Read:
- `AGENTS.md`
- `PROJECT_RULES.md`
- `CURRENT_STATE.md`
- `TASKS.md`
- relevant docs in `/docs`

## Branching

Prefer short-lived feature branches.

Suggested branch naming:
- `docs/...`
- `fix/...`
- `feat/...`
- `refactor/...`
- `audit/...`

Examples:
- `docs/repo-control-layer`
- `fix/document-expiry-clickthrough`
- `feat/supabase-worker-documents`
- `audit/payroll-rules-vs-ui`

## Commit style

Keep commit messages clear and scoped.

Examples:
- `docs: replace starter readme with project overview`
- `fix: preserve flat-rate holiday pay logic`
- `feat: add worker document drawer click-through`
- `refactor: extract payroll line summary component`

## Pull request expectations

Every PR should include:
- purpose of the change
- user/business impact
- touched files
- migration impact, if any
- manual test steps
- screenshots if UI changed
- known limitations

## PR size

Prefer smaller PRs over large mixed PRs.

Bad:
- docs + payroll refactor + route rename + UI cleanup

Good:
- docs-only PR
- focused payroll rule fix
- focused document drawer behavior fix

## Schema changes

If a PR changes data shape:
- document it
- update `docs/data-model.md`
- update migration documentation
- explain backward compatibility implications

## Dependency additions

If adding a dependency:
- justify why native/current tools are insufficient
- explain why this dependency is worth long-term maintenance
- keep additions rare

## Documentation updates

You must update docs when changing:
- business rules
- workflow behavior
- data structures
- UI patterns
- current project state

## Review checklist

Before opening or merging:
- scope is focused
- no unrelated changes included
- docs updated where needed
- no secrets committed
- no accidental broad redesign
- critical business logic preserved
- edge cases considered
