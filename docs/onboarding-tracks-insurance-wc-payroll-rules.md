# Onboarding Tracks — Insurance, WC, and Payroll Rules

This document defines the correct business rules for the four onboarding tracks in IWS.

## Track 1 — Office Staff
These are our own office/admin/internal employees.

### Payroll
- Our payroll
- WPS through C3

### Insurance / Compensation
- We provide health insurance
- Workmen’s compensation is not required for office staff unless business policy is later changed

### Core document responsibility
- Worker provides personal identity/immigration documents
- We provide company-side health insurance evidence where required

### Typical required documents
- Passport copy
- Passport photo
- UAE visa
- Emirates ID
- Health insurance
- Offer / employment documents
- Any internal onboarding documents required for activation

---

## Track 2 — Site Staff
These are our own direct manpower / site / industrial employees.

### Payroll
- Our payroll
- WPS through C3

### Insurance / Compensation
- We provide health insurance
- We provide workmen’s compensation

### Core document responsibility
- Worker provides personal identity/immigration documents
- We provide company-side insurance / WC evidence where required

### Typical required documents
- Passport copy
- Passport photo
- UAE visa
- Emirates ID
- Health insurance
- Workmen’s compensation
- Offer / employment documents
- Site/safety/access/compliance documents as required

---

## Track 3 — Contract Workers
These are workers handled by us operationally and paid through our payroll, but on the contract-worker model.

### Payroll
- Our payroll
- Non-WPS through C3

### Insurance / Compensation
- Worker has their own health insurance
- We provide workmen’s compensation

### Core document responsibility
- Worker provides personal identity/immigration documents
- Worker provides proof of own health insurance
- We provide workmen’s compensation evidence where required

### Typical required documents
- Passport copy
- Passport photo
- UAE visa
- Emirates ID
- Worker’s own health insurance
- Workmen’s compensation

---

## Track 4 — Supplier Workers
These are workers employed and paid by supplier companies.

### Payroll
- Not our payroll
- Supplier payroll
- Supplier invoice flow

### Insurance / Compensation
- Supplier provides health insurance
- Supplier provides workmen’s compensation insurance

### Core document responsibility
Supplier must provide:
- Passport copy
- National ID / Emirates ID
- Health insurance
- Workmen’s compensation insurance

### Typical required documents
- Passport copy
- Passport photo if required operationally
- Emirates ID / national ID
- Health insurance
- Workmen’s compensation insurance
- Any supplier/site compliance documents required

---

# Global Rules

## Rule 1 — Track must be chosen first
Every worker must be assigned to the correct onboarding track before document requirements, payroll routing, or activation logic is applied.

## Rule 2 — Payroll routing depends on track
- Track 1: Our payroll, WPS through C3
- Track 2: Our payroll, WPS through C3
- Track 3: Our payroll, Non-WPS through C3
- Track 4: Supplier payroll, not our payroll

## Rule 3 — Insurance provider and blocking logic are not the same thing
A document can be:
- required
- blocking
- company-provided
- worker-provided
- supplier-provided

These must be handled separately in the system.

## Rule 4 — Supplier workers must never drift into our payroll path
Track 4 workers are compliance-tracked by us but not payroll-processed by us.

## Rule 5 — Document templates must match these rules
Any onboarding template or document register logic must stay aligned with these four-track rules.
