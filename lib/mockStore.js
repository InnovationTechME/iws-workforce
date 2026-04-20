// lib/mockStore.js
// STUB — April 2026
//
// Original mock data files (data/mockWorkers.js, mockDocuments.js, etc.) were
// deleted in commit ad8465d when PR #2 migrated core flows to Supabase. This
// file remains imported by legacy pages that haven't been migrated
// yet (see TECH_DEBT below).
//
// Until those pages are migrated PR-by-PR to Supabase, this stub keeps all
// ~140 named exports importable with safe empty defaults so the build
// doesn't fail. Pages that read these exports will show empty data — that's
// correct behaviour; the real data lives in Supabase now.
//
// DO NOT add real logic here. When a page that uses one of these exports
// gets migrated, its imports move to the appropriate service in lib/ and
// the usage here is removed. When all usages are gone, delete this file.
//
// TECH_DEBT — files still importing from this stub (grep "mockStore"):
//   app/attendance/page.js
//   app/inbox/page.js
//   app/leave/page.js
//   app/offers/page.js
//   app/warnings/page.js
//   app/workers/[id]/page.js

// --- id helper (pure, no data dependency) ---
export function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

// --- workers ---
export function getWorkers() { return [] }
export function getWorker(_id) { return null }
export function getActiveWorkers() { return [] }
export function getVisibleWorkers() { return [] }
export function getActiveVisibleWorkers() { return [] }
export function addWorker(_data) { return null }
export function updateWorker(_id, _updates) { return null }

// --- documents ---
export function getDocuments() { return [] }
export function getDocumentsByWorker(_workerId) { return [] }
export function addDocument(_data) { return null }
export function updateDocument(_id, _updates) { return null }
export function deleteDocument(_id) { return false }

// --- certifications ---
export function getCertifications() { return [] }
export function getCertificationsByWorker(_workerId) { return [] }
export function addCertification(_data) { return null }
export function updateCertification(_id, _updates) { return null }

// --- timesheets ---
export function getTimesheetHeaders() { return [] }
export function getTimesheetHeader(_id) { return null }
export function getTimesheetLines(_headerId) { return [] }
export function getAllTimesheetLines() { return [] }
export function addTimesheetHeader(_data) { return null }
export function addTimesheetLine(_data) { return null }
export function updateTimesheetLine(_id, _updates) { return null }
export function updateTimesheetHeader(_id, _updates) { return null }
export function deleteTimesheetLine(_id) { return false }

// --- payroll (PR #6 uses Supabase — these stubs are for legacy pages only) ---
export function getPayrollBatch() { return null }
export function getPayrollLines() { return [] }
export function getPayrollLine(_workerId) { return null }
export function updatePayrollLine(_id, _updates) { return null }
export function updatePayrollBatch(_updates) { return null }
export function addPayrollAdjustment(_data) { return null }
export function getPayrollAdjustments(_batchId, _workerId) { return [] }
export function getAllPayrollBatches() { return [] }
export function getPayrollBatchByMonth(_month) { return null }
export function getPayrollLinesByBatch(_batchId) { return [] }
export function canEditPayrollBatch(_batchId) { return false }
export function lockPayrollBatch(_batchId) { return null }
export function unlockPayrollBatch(_batchId, _ownerName, _reason) { return null }
export function addCorrectionNote(_batchId, _note, _userName) { return null }
export function approvePayrollBatchOwner(_batchId, _ownerName) { return null }
export function getPayrollHistory() { return [] }
export function getPayrollHistoryByYear(_year) { return [] }
export function getPayrollYearSummary(_year) { return null }
export function getRetentionStatus(_batch) { return null }

// --- warnings ---
export function getWarnings() { return [] }
export function getWarningsByWorker(_workerId) { return [] }
export function addWarning(_data) { return null }
export function updateWarning(_id, _updates) { return null }

// --- blacklist ---
export function getBlacklist() { return [] }
export function addToBlacklist(_data) { return null }
export function checkBlacklist(_passportNumber) { return null }

// --- leave ---
export function getLeaveRecords() { return [] }
export function getLeaveByWorker(_workerId) { return [] }
export function addLeaveRecord(_data) { return null }
export function updateLeaveRecord(_id, _updates) { return null }
export function getLeaveEligibility(_workerId) { return null }
export function calculateLeaveDays(_startDate, _endDate) { return 0 }
export function calculateSalaryHold(_workerId) { return 0 }
export function confirmWorkerReturn(_leaveId, _confirmedBy) { return null }
export function checkNonReturnStatus() { return [] }
export function calculateLeaveBalance(_workerId) { return 0 }

// --- letters ---
export const generateRefNumber = (_letter_type) => ''
export const getLetters = () => []
export const getLettersByWorker = (_worker_id) => []
export const addLetter = (_letter) => null
export const getWorkerWarningLevel = (_worker_id) => 0
export const getNextWarningType = (_worker_id) => null
export const getLetterRegister = () => []
export function getLetterStats() { return null }

// --- tasks ---
export const getTasks = () => []
export const getTasksByWorker = (_worker_id) => []
export const getPendingTasks = () => []
export const addTask = (_task) => null
export const completeTask = (_id, _completed_by) => null
export const addWorkerWithC3Task = (_worker) => null

// --- offboarding ---
export const OFFBOARDING_ITEMS = []
export const getOffboarding = () => []
export const getOffboardingByWorker = (_worker_id) => null
export const initiateOffboarding = (_worker_id, _reason, _last_working_date, _initiated_by) => null
export const tickOffboardingItem = (_offboarding_id, _item_key, _done_by) => null
export const canCloseOffboarding = (_offboarding_id) => false
export const closeOffboarding = (_offboarding_id, _done_by) => null

// --- public holidays ---
export const getPublicHolidays = () => []
export const addPublicHoliday = (_h) => null
export const removePublicHoliday = (_id) => null
export const isPublicHoliday = (_dateStr) => false
export const getHolidayName = (_dateStr) => null

// --- ramadan mode ---
export const getRamadanMode = () => ({ active: false, start_date: null, end_date: null })
export const setRamadanMode = (_active, _start_date, _end_date, _activated_by) => null
export const isRamadanDate = (_dateStr) => false

// --- hourly pay helper ---
export const calculateHourlyPay = (_worker, _date, _hours) => 0

// --- timesheet discrepancies ---
export const getDiscrepancies = (_header_id) => []
export const getAllDiscrepancies = () => []
export const addDiscrepancy = (_d) => null
export const resolveDiscrepancy = (_id, _resolved_by, _resolution, _use_client_hours) => null
export const getPendingDiscrepancies = () => []

// --- file naming ---
export const generateDocFileName = (_worker, _document_type, _original_extension) => ''

// --- attendance ---
export const getAttendance = () => []
export const addAttendanceRecord = (_rec) => null
export const getAttendanceByWorker = (_worker_id) => []
export function getAttendanceByWorkerSummary(_workerId) { return null }
export function getAbsentToday() { return [] }
export function getAbsencePercentage(_dateStr) { return 0 }
export function getWeeklyAttendanceGrid(_startDate) { return [] }
export function getMonthlyAttendanceSummary(_year, _month) { return [] }

// --- penalty deductions ---
export const getPenaltyDeductions = () => []
export const addPenaltyDeduction = (_item) => null
export const confirmPenaltyDeduction = (_id) => null
export const removePenaltyDeduction = (_id) => null
export function calculateNWNPDeduction(_worker, _absentDate) { return 0 }
export function checkWeekendExtensionRule(_absentDate) { return false }
export function checkHolidayExtensionRule(_absentDate) { return false }
export function checkMonthlyPenaltyCap(_workerId, _month, _year, _newPenaltyAmount) { return false }

// --- attendance conflicts ---
export function getAttendanceConflicts() { return [] }
export function getConflictsByWorker(_workerId) { return [] }
export function getPendingConflicts() { return [] }
export function createAttendanceConflict(_attendanceRecord, _conflictType, _defaultDeduction) { return null }
export function submitHRClarification(_conflictId, _clarification, _hrName) { return null }
export function approveConflictResolution(_conflictId, _opsName, _resolution, _finalDeduction) { return null }
export function autoResolveExpiredConflicts() { return 0 }

// --- carry-over notes ---
export function getCarryOverNotes() { return [] }
export function getCarryOverNotesByWorker(_workerId) { return [] }
export function getPendingCarryOverNotes() { return [] }
export function addCarryOverNote(_note) { return null }
export function resolveCarryOverNote(_id, _resolvedBy) { return null }

// --- offences ---
export const getWorkerOffenceCount = (_worker_id) => 0

// --- dashboard aggregates ---
export function getDashboardMetrics() {
  return {
    totalWorkers: 0,
    activeWorkers: 0,
    pendingApprovals: 0,
    missingDocs: 0,
    expiringDocs: 0,
    onLeave: 0,
  }
}
export function getInboxItems() { return [] }
export function getILOEStatus(_workerId) { return null }
export function getWorkersWithILOEIssues() { return [] }
export function getWorkforceBreakdown() { return { direct: 0, contract: 0, subcontract: 0, office: 0 } }
export function getSubcontractorsByCompany() { return [] }
export function getInsuranceCoverageCount() { return { insured: 0, uninsured: 0 } }
export function getWorkforceSnapshotOnDate(_dateString) { return null }
export function getPackCoverage() { return [] }

// --- approvals ---
export function getPendingApprovalsForRole(_role) { return [] }
export function approveTimesheet(_headerId, _role, _userName) { return null }
export function rejectTimesheet(_headerId, _role, _userName, _reason) { return null }
export function approvePayrollBatch(_role, _userName) { return null }
export function rejectPayrollBatch(_role, _userName, _reason) { return null }
export function approveWarning(_warningId, _role, _userName) { return null }
export function rejectWarning(_warningId, _role, _userName, _reason) { return null }
export function approveTermination(_offboardingId, _role, _userName) { return null }
export function rejectTermination(_offboardingId, _role, _userName, _reason) { return null }

// --- display helpers ---
export function getWorkerDisplay(_workerId) { return null }
