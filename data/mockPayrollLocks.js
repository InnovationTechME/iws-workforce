// data/mockPayrollLocks.js
// STUB — April 2026
// Original deleted in commit ad8465d. Still imported by app/timesheets/page.js.
// Returns permissive defaults — nothing is locked, uploads allowed.
// Real locking lives in Supabase public.payroll_batches.status (future PR).
// Delete this file when app/timesheets/page.js is migrated.

export const mockPayrollLocks = []

export function isMonthLocked(_month, _year, _client) { return false }
export function canUploadTimesheet(_month, _year, _client) { return true }