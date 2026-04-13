# Workflows — IWS

## Purpose

This file describes the intended operational workflows of the system.

## Offer to active worker

1. Create offer
2. Enter worker details
3. Blacklist check
4. Save/send/sign offer
5. Move to onboarding
6. Record arrival and medical result
7. Upload required onboarding documents
8. Complete onboarding
9. Move worker to active status

## Document handling workflow

Document actions may begin from:
- HR Inbox
- Worker profile
- Documents page

Expected flow:
1. identify missing/expired/expiring item
2. open relevant action
3. view current record
4. upload new file or renewal
5. update issue/expiry info
6. save and refresh status automatically

## Payroll workflow

1. Upload client timesheet
2. Parse and match workers
3. Review unmatched entries
4. Review monthly grid
5. resolve conflicts
6. confirm timesheet
7. review payroll calculation
8. add adjustments where needed
9. operations approval
10. management approval
11. lock payroll
12. generate outputs
13. distribute payslips / WPS file

## Attendance workflow

1. log absence or attendance issue
2. specify reason
3. attach certificate if relevant
4. system applies logic such as NWNP / warning triggers / conflicts
5. review any conflicts requiring action

## Leave workflow

1. worker submits request
2. HR enters request
3. system checks eligibility
4. upload supporting request document
5. upload ticket proof when required
6. calculate salary hold
7. submit for management approval
8. mark departure
9. confirm return
10. release hold when applicable

## Warning workflow

1. add warning or memo
2. select worker and reason
3. attach penalty details if applicable
4. system determines level
5. generate letter
6. store letter in worker record
7. communicate to worker as required

## Offboarding workflow

1. initiate exit
2. record reason and last working date
3. complete closure checklist
4. block closure until required items are done
5. close file
6. mark worker inactive
7. remove worker from payroll flow

## Approval workflow principle

Approvals should remain explicit.
The system should not hide:
- who approved
- who rejected
- when
- why
- what became locked after approval
