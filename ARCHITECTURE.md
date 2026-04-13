# ARCHITECTURE.md

## Purpose

This file describes the intended architecture of IWS at a practical level for developers and coding agents.

## System overview

IWS is a Next.js App Router application designed for internal workforce operations. It supports multiple roles and covers business-critical workflows such as onboarding, documents, attendance, payroll, and approvals.

## High-level layers

### 1. UI layer
Pages, route-level layouts, forms, tables, dashboards, drawers, modals, and action controls for admin users.

### 2. Domain logic layer
Reusable business logic for:
- worker category rules
- leave eligibility
- absence deductions
- payroll calculations
- approval gates
- warning escalation
- document status logic

### 3. Data access layer
Current or target read/write boundaries for:
- workers
- documents
- payroll
- attendance
- leave
- tasks
- blacklist
- supporting records

### 4. File/document layer
Storage and retrieval of uploaded worker documents, certificates, generated letters, and output files such as payslips or ZIP packs.

### 5. Operational audit layer
State transitions, approvals, warnings, deductions, payroll lock states, and worker file closure behavior must remain traceable.

## Route and module expectations

Documented historical module set includes:
- dashboard
- offers
- onboarding
- workers
- worker detail
- documents
- certifications
- warnings
- leave
- attendance
- timesheets
- reconciliation
- payroll
- payroll run
- payroll settings
- packs
- inbox
- blacklist
- pending approvals
- offboarding

## Entity areas

Key entity groups include:
- workers
- documents
- certifications
- offers
- onboarding
- timesheets
- payroll batches and lines
- adjustments
- attendance
- leave
- warnings
- letters
- blacklist
- tasks
- public holidays
- offboarding
- reactivation requests

## Role model

Main roles:
- Management
- HR Admin
- Operations
- Accounts / Finance

Permissions should follow operational needs, not generic admin defaults.

## Data model direction

Target persistence is Supabase/Postgres. Prior documentation indicates a migration from an in-memory/mock store toward durable tables and storage.

## Architectural constraints

- keep JavaScript
- preserve App Router structure
- avoid unnecessary framework layering
- keep business logic identifiable and testable
- do not scatter critical calculations across many unrelated files
- keep route behavior consistent with documented workflows

## Preferred implementation style

- colocate UI where sensible
- extract shared logic when repeated
- centralize business rules where practical
- keep file naming explicit
- prefer clear, readable code over clever abstractions

## Future architecture goals

- clean Supabase integration boundaries
- role-aware auth and access
- durable file storage
- clearer separation of page UI from business calculations
- improved auditability around approvals and payroll locking
