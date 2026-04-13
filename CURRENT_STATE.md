# CURRENT_STATE.md

## Purpose

This file describes the best-known current state of the IWS codebase and project. It should be updated whenever meaningful implementation progress changes what is true.

## Project identity

IWS — Innovation Workforce System

Internal workforce operations platform for Innovation Technologies LLC O.P.C., an industrial manpower company operating in Abu Dhabi, UAE. The platform handles worker lifecycle, compliance, attendance, timesheets, payroll, letters, and operational approvals.

## Confirmed repository state

From repository inspection:

- Repository: `InnovationTechME/iws-workforce`
- Default branch: `master`
- Next.js app
- React 18
- Tailwind CSS
- Supabase client dependency installed
- XLSX, jsPDF, JSZip installed
- README currently still default starter text and needs replacement

## Historical documented system state

Internal documentation states:

- platform built on Next.js App Router with JavaScript
- deployed on Vercel via GitHub auto-deploy
- core workflows already designed across offers, onboarding, workers, documents, certifications, leave, attendance, timesheets, payroll, packs, inbox, blacklist, and approvals
- earlier state relied on in-memory mock storage before Supabase migration phase

## Confirmed major modules from prior project documentation

- Login
- Dashboard
- Offers
- Onboarding
- Workers
- Worker Detail
- Offboarding Exit
- Documents
- Certifications
- Warnings
- Leave
- Attendance
- Timesheets
- Reconciliation
- Payroll
- Payroll Run
- Payroll Settings
- Packs
- Inbox
- Blacklist
- Pending Approvals

## Confirmed business roles

Documented operational roles include:

- Management
- HR Admin
- Operations
- Accounts / Finance

## Confirmed process direction

### HR flows
Documented HR flow covers:
- creating offers
- onboarding workers
- document uploads and status tracking
- payroll preparation
- warnings
- leave entry and approval routing
- offboarding closure checklist

### Payroll flows
Documented payroll process includes:
- client timesheet upload
- matching workers
- reviewing conflicts
- payroll calculation
- operations approval
- management approval
- WPS export and payslip distribution

### Document handling
Document actions are expected to be reachable from:
- HR Inbox
- Worker profile
- Documents page
with direct drawer-based update flows and status visibility

## Confirmed policy direction

Worker policy documentation includes:
- standard hours
- Ramadan adjustment
- overtime treatment
- flat-rate worker handling
- annual leave rules
- sick leave certificate handling
- attendance penalties
- safety rules and disciplinary escalation

## Confirmed migration direction

Supabase migration documentation includes:
- env variables
- client helper setup
- target table structure for workers, documents, certifications, offers, onboarding, attendance, timesheets, payroll, warnings, letters, leave, tasks, blacklist, holidays, and more

## Current documentation gap

The codebase currently lacks a proper repo operating layer.
The default README is still generic starter text instead of project truth.

## Current known priorities

1. Replace starter repo documentation with real project docs
2. Create agent-safe operating rules
3. Keep business rules centralized
4. Keep migration direction aligned with actual implementation
5. Reduce drift across Claude sessions, Vercel usage, and repo changes

## Current assumptions

These are assumptions pending fresh code audit:
- route/module structure generally exists as documented
- Supabase integration may be partial or in-progress
- current code may not fully match all internal documentation
- some docs may represent intended behavior rather than fully shipped behavior

These assumptions should be reviewed and updated after a full repo audit.

## Open verification items

- actual route/file map in current branch
- actual Supabase wiring status
- actual Vercel project/deployment mapping
- actual auth implementation status
- actual component/system conventions in code
- current unresolved bugs
- current branch/PR workflow conventions

## Immediate next actions

- establish core repo docs
- map actual code structure to architecture docs
- verify current data flow against migration plan
- identify gaps between intended process and implemented UI
- create structured task queue
