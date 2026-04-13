# TASKS.md

## Purpose

This file is the active work queue for the IWS repository.
Keep tasks small, concrete, and reviewable.

## Rules for updating this file

- Move tasks, do not silently delete them
- Mark completed tasks clearly
- Keep task wording actionable
- Split broad work into smaller items
- Link tasks to docs or modules where possible

---

## Now

### Repo control layer
- [ ] Replace default `README.md` with project-specific version
- [ ] Add `AGENTS.md`
- [ ] Add `PROJECT_RULES.md`
- [ ] Add `CURRENT_STATE.md`
- [ ] Add `ROADMAP.md`
- [ ] Add `CONTRIBUTING.md`
- [ ] Add `ARCHITECTURE.md`
- [ ] Add `/docs/business-rules.md`
- [ ] Add `/docs/workflows.md`
- [ ] Add `/docs/data-model.md`
- [ ] Add `/docs/db-migrations-policy.md`
- [ ] Add `/docs/ui-patterns.md`
- [ ] Add `.claude/project-instructions.md`

### Repo audit
- [ ] Audit actual route map against documented route list
- [ ] Audit current Supabase integration status
- [ ] Audit existing role/access logic
- [ ] Audit current document upload/view flow
- [ ] Audit payroll run wizard implementation against documented process
- [ ] Audit worker pack implementation against required pack contents
- [ ] Audit offboarding checklist implementation

### Business-critical behavior checks
- [ ] Verify flat-rate worker payroll logic
- [ ] Verify public holiday payroll treatment
- [ ] Verify Ramadan hour threshold behavior
- [ ] Verify payslip generation and post-net-pay visibility
- [ ] Verify expired document click-through behavior
- [ ] Verify warning escalation and deduction handling
- [ ] Verify leave eligibility and salary hold logic
- [ ] Verify subcontractor and contract worker compensation logic
- [ ] Verify workmen compensation requirement in worker packs

---

## Next

### Supabase migration alignment
- [ ] Compare actual code entities to documented target schema
- [ ] Identify missing tables/fields required for live persistence
- [ ] Define migration order for low-risk rollout
- [ ] Define storage strategy for document files
- [ ] Define auth and role mapping approach
- [ ] Define seed/sample data strategy for non-production testing

### UI/system consistency
- [ ] Standardize table patterns
- [ ] Standardize drawer/modal behavior
- [ ] Standardize status badges and colors
- [ ] Standardize worker detail tab structure
- [ ] Standardize empty/loading/error states
- [ ] Standardize approval action patterns

---

## Later

### Operational enhancements
- [ ] Client timesheet import hardening
- [ ] Reconciliation audit history
- [ ] Better payroll diff/conflict explanations
- [ ] Worker self-service or limited access review
- [ ] WhatsApp-assisted communication workflows
- [ ] Approval timeline visibility
- [ ] Document verification traceability
- [ ] Reporting and dashboards

### Automation opportunities
- [ ] Document expiry reminder automation
- [ ] Payroll pre-check automation
- [ ] Missing document chase workflows
- [ ] Exception dashboard for HR Inbox
- [ ] Attendance anomaly flagging
- [ ] Leave return follow-up automation

---

## Blockers / open questions
- [ ] Confirm live Supabase status in current repo
- [ ] Confirm current Vercel project binding
- [ ] Confirm which route/modules are fully production-ready
- [ ] Confirm whether `master` remains intentional default branch
