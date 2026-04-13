# ROADMAP.md

## Purpose

This roadmap organizes IWS work into phased, practical delivery blocks. It is intended to keep the team focused and to prevent uncontrolled expansion.

## Guiding principle

Stabilize before expanding.
Persistence, correctness, and operational clarity matter more than new features.

---

## Phase 1 — Repo Control and System Stabilization

### Goal
Create a clean project operating layer and verify the current implementation against documented business rules.

### Outcomes
- real repo documentation
- controlled agent behavior
- verified current architecture
- documented task queue
- reduced project drift

### Deliverables
- `README.md`
- `AGENTS.md`
- `PROJECT_RULES.md`
- `CURRENT_STATE.md`
- `TASKS.md`
- `ARCHITECTURE.md`
- core `/docs/*` files
- route/module audit
- business-critical behavior audit

---

## Phase 2 — Supabase Foundation and Data Persistence

### Goal
Move from partial/mock/local behavior toward durable persistence and production data flow.

### Outcomes
- consistent Supabase environment setup
- production-ready core entities
- documented migration order
- file storage strategy
- role-aware backend foundations

### Deliverables
- finalized data model
- migration scripts and policy
- Supabase helpers and service boundaries
- storage conventions
- environment setup documentation
- audit of mock vs live data dependencies

---

## Phase 3 — Operational Correctness

### Goal
Ensure the system behaves correctly for the core real-world workflows.

### Priority areas
- worker lifecycle
- document expiry and renewal flows
- attendance and absence handling
- payroll logic by category
- leave and salary hold
- disciplinary actions
- offboarding blockers
- payslip generation and access

### Deliverables
- verified payroll rules
- verified leave rules
- verified warning rules
- verified document click-through and traceability
- verified worker pack content rules

---

## Phase 4 — Workflow Hardening and Admin Efficiency

### Goal
Improve speed, visibility, and confidence for HR, Operations, Management, and Finance users.

### Outcomes
- cleaner admin patterns
- stronger inbox workflows
- reduced manual friction
- clearer approvals and status tracking

### Deliverables
- standardized table/action patterns
- improved HR Inbox actions
- approval visibility improvements
- better reconciliation tooling
- operational dashboards

---

## Phase 5 — Automation and Scale

### Goal
Add carefully targeted automation without damaging reliability.

### Areas
- reminders
- anomaly detection
- payroll pre-checks
- missing document follow-ups
- timesheet exception handling
- reporting and executive summaries
- external communication hooks where appropriate

### Constraint
Automation must support staff, not obscure accountability.

---

## Out of scope unless explicitly approved

- broad visual redesign
- unplanned technology migrations
- generic SaaS feature sprawl
- multi-tenant abstraction work
- replacing domain logic with generic HR templates
