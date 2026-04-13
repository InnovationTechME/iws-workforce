# Data Model — IWS

## Purpose

This file summarizes the main entities and intended relationships in the IWS system, based on current internal migration planning.

## Core entities

### workers
Primary entity representing active or inactive workers.

Key concepts:
- worker number
- name
- trade/role
- category
- status
- pay type
- salary/hourly rate
- allowances
- identity and visa fields
- payment method
- C3/Endered information
- join/end dates
- contact data

### documents
Worker-linked documents.

Key concepts:
- document category
- document type
- issue date
- expiry date
- status
- file URL / name
- notes
- locked state

### certifications
Worker-linked certification records.

Key concepts:
- certification type
- issuer
- issue/expiry
- renewal required
- file metadata

### offers
Pre-onboarding commercial/employment offer records.

### onboarding
Tracks movement from offer into active worker status.

### timesheet headers / lines
Represents imported or manual timesheet batches and per-worker/per-day lines.

### payroll batches / lines / adjustments
Represents payroll run grouping, per-worker results, and manual adjustments.

### warnings
Stores warning or disciplinary events.

### letters
Stores generated letter references and outputs.

### leave records
Stores leave requests, approvals, salary hold fields, return confirmation, and related data.

### attendance
Stores absence/sick/late/attendance issue records.

### penalty deductions
Stores deduction items that may affect payroll.

### attendance conflicts
Stores unresolved discrepancy cases for HR/Operations review.

### blacklist
Stores blacklisted candidates/workers and reasons.

### offboarding
Stores worker exit workflow and checklist state.

### tasks
Operational tasks such as card requests and follow-ups.

### public holidays
Holiday calendar for payroll and operational rules.

### reactivation requests
Tracks return-to-work requests for inactive workers.

## Relationship direction

Primary relationship pattern:
- worker is the center
- documents, certifications, warnings, letters, attendance, leave, payroll lines, and offboarding all relate to worker
- timesheet lines connect both to headers and worker
- payroll lines connect to payroll batches and worker
- adjustments typically connect to payroll batch and worker

## Important modeling principle

Do not add fields casually.
Changes to core entities should be documented and justified because UI, business rules, and workflows depend heavily on stable field meanings.

## Audit-sensitive entities

Treat these as especially sensitive:
- payroll batches
- payroll lines
- deductions
- attendance conflicts
- warnings
- letters
- offboarding
- leave approvals
- documents with expiry

## Future work

This file should be updated with:
- exact field lists after code audit
- enum/value conventions
- storage bucket strategy
- auth/ownership rules
- RLS notes if used
