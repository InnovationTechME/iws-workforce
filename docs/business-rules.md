# Business Rules — IWS

## Purpose

This file defines the business rules that the IWS platform must respect. These rules come from internal operating documents and should not be replaced with generic assumptions.

## Worker categories and pay logic

### Core staff
Core Innovation staff are paid on salary logic with applicable overtime and benefits where defined by the company’s operating model.

### Contract workers
Contracted hourly workers are paid a flat hourly rate.

### Subcontract workers
Subcontractors are also treated as flat-rate hourly workers.

These distinctions are explicitly important in the company’s operational direction and must be preserved in payroll logic.

## Working hours

Standard documented hours:
- 8 hours per day
- 6 days per week
- 48 hours per week
- Ramadan reduces standard daily working hours to 6 hours per day

## Overtime rules

Documented policy states:
- hours above 8 per day count as overtime
- weekday overtime is 1.25x hourly rate
- rest-day and public holiday overtime is 1.50x for monthly site staff
- Friday is a normal working day unless it is separately configured as a public holiday
- flat-rate contract and subcontract workers are paid their flat hourly rate only, with no overtime or holiday premium

## Leave rules

Documented leave logic includes:
- under 12 months: leave blocked
- 12 to 24 months: management discretion required
- salary hold behavior applies
- after 24 months: leave becomes a right
- annual entitlement is 30 calendar days per completed year of service

## Salary hold on leave

Operational docs indicate salary hold is part of the leave process and is released when the worker returns. This logic must remain visible and auditable.

## Payroll process rules

The documented payroll flow includes:
1. timesheet upload
2. review/matching
3. timesheet conflict handling
4. payroll calculation review
5. operations approval
6. management approval
7. lock state
8. WPS export and payslip distribution

No implementation should bypass approval stages casually.

## Payslips

Payslips are expected to exist and be viewable as part of payroll outputs and worker-facing or admin-review flows. Internal guidance also explicitly expects payslips to remain viewable after net pay is calculated.

## Attendance and absence

Documented rules include:
- worker must notify supervisor before shift if unable to attend
- same-day sick leave certificate handling is required
- unverifiable or missing certificate results in unauthorized absence treatment
- repeated unauthorized absence escalates penalties
- severe absence patterns may trigger dismissal logic under documented policy

## Warning and penalty logic

The system is expected to support:
- warnings and memos
- escalation levels
- deduction linkage where applicable
- letter generation
- visibility in worker profile and HR workflows

## Document management rules

Document statuses include:
- missing
- valid
- expiring soon
- expired

Operational handling expects users to be able to open and update the underlying document from the relevant queue/profile flows.

## Worker packs

Worker packs must reflect actual business requirements.
Current company direction includes:
- workmen compensation required
- passport photo included in worker document file
- not “medical” as a substitute in this context

This must be reflected in pack rules and UI labels.

## Onboarding requirements

Documented onboarding requires core required uploads before completion:
- passport copy
- passport photo
- medical certificate
- signed offer letter
Additional identity/labour documents are uploaded when available.

## Offboarding blockers

Offboarding cannot be considered complete until documented checklist items are done, including items such as:
- insurance cancellation
- payroll card cancellation
- final payslip
- EOS handling
- visa/labour closure actions
- worker clearance documentation

## Public holidays

Public holidays affect payroll and time treatment.
The system must preserve a holiday-aware structure and not assume standard days in those calculations. Public holiday data is also part of the documented schema direction.

## Compliance principle

Where policy docs, process docs, and payroll logic intersect, implementation should preserve auditability, explicit statuses, and visible approval states.
