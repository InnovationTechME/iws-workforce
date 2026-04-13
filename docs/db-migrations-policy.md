# DB Migrations Policy — IWS

## Purpose

This file defines how database changes should be handled for IWS.

## Core rule

No undocumented schema drift.

Any meaningful database change must be:
- intentional
- reviewable
- documented
- traceable

## Required steps for schema changes

1. Explain why the schema change is needed
2. Identify affected entities
3. Document the intended data impact
4. Add or update migration files
5. Update `docs/data-model.md`
6. Verify UI and business docs still match
7. Note any backfill or compatibility needs

## Do not

- edit production schema casually
- rename fields without migration planning
- drop columns without explicit review
- introduce hidden enum/value changes
- leave docs behind after schema change

## Migration design principles

- prefer additive changes over destructive ones
- keep migrations small and understandable
- preserve existing data whenever possible
- separate structural changes from broad data rewrites
- test the narrowest safe migration path

## High-risk schema areas

- payroll
- attendance
- leave
- documents
- approvals
- worker status
- payment methods
- holiday logic

## Rollout guidance

Where possible:
- introduce schema
- adapt data access layer
- adapt UI
- test
- retire legacy path later

Avoid big-bang changes unless absolutely necessary.

## Storage-related changes

If changing file/document storage behavior:
- define bucket/location strategy
- define public/private access rules
- define file naming convention
- define replacement/versioning behavior
- ensure click-through/view flows remain intact

## Documentation expectation

A schema change is not complete until:
- migration is written
- `docs/data-model.md` is updated
- any affected business rules are updated
- task state is updated
