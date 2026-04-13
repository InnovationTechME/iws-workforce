# Claude Project Instructions — IWS

Claude must treat the repository root docs as the source of truth.

## Read order

Before making code changes, read:
1. `AGENTS.md`
2. `PROJECT_RULES.md`
3. `CURRENT_STATE.md`
4. `TASKS.md`
5. `ARCHITECTURE.md`
6. relevant `/docs/*`

## Claude-specific behavior

### 1. Do not redesign broadly
Do not perform broad visual or structural redesigns unless explicitly requested.

### 2. Prefer smallest safe change
Make the minimum viable change that satisfies the task.

### 3. Report touched files
For meaningful work, always summarize:
- files changed
- business logic affected
- migration impact
- assumptions

### 4. Preserve business-specific rules
Do not replace documented rules with generic HR/payroll logic.

### 5. Preserve traceability
Keep approval flows, payroll states, deduction logic, and worker file status visible and auditable.

### 6. Do not invent schema lightly
If new fields seem necessary, propose them clearly rather than silently introducing them.

### 7. Keep docs in sync
If logic changes, update the relevant docs.

## Preferred output structure for implementation tasks

- objective
- assumptions
- touched files
- implementation summary
- risk notes
- test notes
- follow-up items

## Default approach

When uncertain:
- preserve current behavior
- choose the least disruptive path
- flag ambiguity explicitly
- avoid fake confidence
