# UI Patterns — IWS

## Purpose

This file describes preferred UI behavior patterns for consistency across the admin system.

## General principle

This is an operations-heavy internal platform.
UI should optimize for:
- speed
- clarity
- traceability
- low ambiguity
- easy repetitive use

## Tables

Use tables for:
- workers
- documents
- certifications
- attendance
- payroll lines
- approvals
- warnings
- leave lists

Tables should support:
- clear status badges
- row click or action click consistency
- search/filter where useful
- practical density
- obvious empty states

## Drawers vs modals

Prefer drawers when the user needs:
- context while editing
- reviewing a row and related metadata
- document or status updates

Prefer modals for:
- confirmation
- destructive actions
- short focused decisions

## Status colors

Statuses should remain visually consistent across modules.
Examples:
- expired / blocked / danger
- expiring soon / warning
- valid / complete / approved
- missing / unstarted / neutral

Do not invent new badge semantics casually.

## Worker detail pages

Worker profiles should keep stable tab structure where possible.
Expected major areas include:
- profile
- documents
- certifications
- warnings
- letters

Do not fragment worker context across too many unrelated pages without reason.

## Document interaction pattern

Users should be able to:
- identify document status quickly
- open the relevant document record directly
- renew/upload from the alert context
- view issue and expiry dates clearly

This is especially important for expired and expiring items.

## Payroll review pattern

Payroll screens should favor:
- visible totals
- worker line drilldown
- visible warnings/conflicts
- approval gating clarity
- lock state clarity
- downloadable output actions after approval

## Approval pattern

Approval screens should always make clear:
- what is being approved
- current status
- who approved/rejected
- what happens next
- whether state becomes locked

## Empty states

Empty states should:
- explain what is missing
- suggest the next action
- not feel like an error unless it really is one

## Error states

Errors should be operationally useful.
Prefer:
- plain language
- what failed
- what user can do next

## Avoid

- decorative complexity
- hidden important actions
- inconsistent row click behavior
- vague status labels
- multi-step flows with no progress clarity
