'use client'

import mockWorkers from '../data/mockWorkers'
import mockDocuments from '../data/mockDocuments'
import mockCertifications from '../data/mockCertifications'
import { mockTimesheetHeaders, mockTimesheetLines } from '../data/mockTimesheets'
import { mockPayrollBatches, mockPayrollLines } from '../data/mockPayroll'
import mockWarnings from '../data/mockWarnings'
import mockOffers from '../data/mockOffers'
import mockOnboardingRecords from '../data/mockOnboarding'
import mockBlacklist from '../data/mockBlacklist'
import mockLeaveRecords from '../data/mockLeave'
import { mockAttendance } from '../data/mockAttendance'
import { mockLetters } from '../data/mockLetters'
import { mockTasks } from '../data/mockTasks'
import { mockOffboarding } from '../data/mockOffboarding'
import { mockPublicHolidays, RAMADAN_2026 } from '../data/mockPublicHolidays'
import { TODAY } from './utils'

export function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

const store = {
  workers: [...mockWorkers],
  documents: [...mockDocuments],
  certifications: [...mockCertifications],
  timesheetHeaders: [...mockTimesheetHeaders],
  timesheetLines: [...mockTimesheetLines],
  payrollBatches: [...mockPayrollBatches],
  payrollLines: [...mockPayrollLines],
  payrollAdjustments: [],
  warnings: [...mockWarnings],
  offers: [...mockOffers],
  onboardingRecords: [...mockOnboardingRecords],
  blacklist: [...mockBlacklist],
  leaveRecords: [...mockLeaveRecords]
}

// Workers
export function getWorkers() { return store.workers }
export function getWorker(id) { return store.workers.find(w => w.id === id) || null }
export function getActiveWorkers() { return store.workers.filter(w => w.active) }
export function addWorker(data) {
  const worker = { ...data, id: makeId('w'), created_at: '2026-04-08' }
  store.workers.unshift(worker)
  return worker
}
export function updateWorker(id, updates) {
  const idx = store.workers.findIndex(w => w.id === id)
  if (idx === -1) return null
  store.workers[idx] = { ...store.workers[idx], ...updates }
  return store.workers[idx]
}

// Documents
export function getDocuments() { return store.documents }
export function getDocumentsByWorker(workerId) { return store.documents.filter(d => d.worker_id === workerId) }
export function addDocument(data) {
  const doc = { ...data, id: makeId('doc'), locked: false, unlock_reason: null }
  store.documents.unshift(doc)
  return doc
}
export function updateDocument(id, updates) {
  const idx = store.documents.findIndex(d => d.id === id)
  if (idx === -1) return null
  store.documents[idx] = { ...store.documents[idx], ...updates }
  return store.documents[idx]
}
export function deleteDocument(id) {
  store.documents = store.documents.filter(d => d.id !== id)
}

// Certifications
export function getCertifications() { return store.certifications }
export function getCertificationsByWorker(workerId) { return store.certifications.filter(c => c.worker_id === workerId) }
export function addCertification(data) {
  const cert = { ...data, id: makeId('cert') }
  store.certifications.unshift(cert)
  return cert
}
export function updateCertification(id, updates) {
  const idx = store.certifications.findIndex(c => c.id === id)
  if (idx === -1) return null
  store.certifications[idx] = { ...store.certifications[idx], ...updates }
  return store.certifications[idx]
}

// Timesheets
export function getTimesheetHeaders() { return store.timesheetHeaders }
export function getTimesheetHeader(id) { return store.timesheetHeaders.find(h => h.id === id) || null }
export function getTimesheetLines(headerId) { return store.timesheetLines.filter(l => l.header_id === headerId) }
export function getAllTimesheetLines() { return store.timesheetLines }
export function addTimesheetHeader(data) {
  const header = { ...data, id: makeId('th'), created_at: '2026-04-08' }
  store.timesheetHeaders.unshift(header)
  return header
}
export function addTimesheetLine(data) {
  const line = { ...data, id: makeId('tl') }
  store.timesheetLines.unshift(line)
  return line
}
export function updateTimesheetHeader(id, updates) {
  const idx = store.timesheetHeaders.findIndex(h => h.id === id)
  if (idx === -1) return null
  store.timesheetHeaders[idx] = { ...store.timesheetHeaders[idx], ...updates }
  return store.timesheetHeaders[idx]
}
export function deleteTimesheetLine(id) {
  store.timesheetLines = store.timesheetLines.filter(l => l.id !== id)
}

// Payroll
export function getPayrollBatch() { return store.payrollBatches[0] || null }
export function getPayrollLines() { return store.payrollLines }
export function getPayrollLine(workerId) { return store.payrollLines.find(l => l.worker_id === workerId) || null }
export function updatePayrollLine(id, updates) {
  const idx = store.payrollLines.findIndex(l => l.id === id)
  if (idx === -1) return null
  store.payrollLines[idx] = { ...store.payrollLines[idx], ...updates }
  return store.payrollLines[idx]
}
export function updatePayrollBatch(updates) {
  store.payrollBatches[0] = { ...store.payrollBatches[0], ...updates }
  return store.payrollBatches[0]
}
export function addPayrollAdjustment(data) {
  const adj = { ...data, id: makeId('adj') }
  store.payrollAdjustments.push(adj)
  return adj
}
export function getPayrollAdjustments(batchId, workerId) {
  return store.payrollAdjustments.filter(a => a.batch_id === batchId && a.worker_id === workerId)
}

// Warnings
export function getWarnings() { return store.warnings }
export function getWarningsByWorker(workerId) { return store.warnings.filter(w => w.worker_id === workerId) }
export function addWarning(data) {
  const warning = { ...data, id: makeId('wm') }
  store.warnings.unshift(warning)
  return warning
}
export function updateWarning(id, updates) {
  const idx = store.warnings.findIndex(w => w.id === id)
  if (idx === -1) return null
  store.warnings[idx] = { ...store.warnings[idx], ...updates }
  return store.warnings[idx]
}

// Offers
export function getOffers() { return store.offers }
export function getOffer(id) { return store.offers.find(o => o.id === id) || null }
export function addOffer(data) {
  const offer = { ...data, id: makeId('off'), created_at: '2026-04-08' }
  store.offers.unshift(offer)
  return offer
}
export function updateOffer(id, updates) {
  const idx = store.offers.findIndex(o => o.id === id)
  if (idx === -1) return null
  store.offers[idx] = { ...store.offers[idx], ...updates }
  return store.offers[idx]
}

// Onboarding
export function getOnboardingRecords() { return store.onboardingRecords }
export function getOnboardingRecord(workerId) { return store.onboardingRecords.find(r => r.worker_id === workerId) || null }
export function addOnboardingRecord(data) {
  const record = { ...data, id: makeId('ob'), created_at: '2026-04-08' }
  store.onboardingRecords.unshift(record)
  return record
}
export function updateOnboardingRecord(id, updates) {
  const idx = store.onboardingRecords.findIndex(r => r.id === id)
  if (idx === -1) return null
  store.onboardingRecords[idx] = { ...store.onboardingRecords[idx], ...updates }
  return store.onboardingRecords[idx]
}

// Blacklist
export function getBlacklist() { return store.blacklist }
export function addToBlacklist(data) {
  const entry = { ...data, id: makeId('bl'), blacklisted_at: '2026-04-08' }
  store.blacklist.unshift(entry)
  return entry
}
export function checkBlacklist(passportNumber) {
  if (!passportNumber) return null
  return store.blacklist.find(e => e.passport_number?.toLowerCase() === passportNumber?.toLowerCase()) || null
}

// Leave
export function getLeaveRecords() { return store.leaveRecords }
export function getLeaveByWorker(workerId) { return store.leaveRecords.filter(l => l.worker_id === workerId) }
export function addLeaveRecord(data) {
  const record = { ...data, id: makeId('lv') }
  store.leaveRecords.unshift(record)
  return record
}
export function updateLeaveRecord(id, updates) {
  const idx = store.leaveRecords.findIndex(l => l.id === id)
  if (idx === -1) return null
  store.leaveRecords[idx] = { ...store.leaveRecords[idx], ...updates }
  return store.leaveRecords[idx]
}

// Letters
let letters = [...mockLetters]

const refCounters = { offer_letter: 2, warning_1st: 2, warning_2nd: 1, warning_final: 1, experience_letter: 1, memo: 2, termination_notice: 1, termination_no_notice: 1, resignation_acceptance: 1 }
const refPrefixes = { offer_letter:'IT-OL', warning_1st:'IT-WL', warning_2nd:'IT-WL', warning_final:'IT-WL', experience_letter:'IT-EL', memo:'IT-ML', termination_notice:'IT-TN', termination_no_notice:'IT-TX', resignation_acceptance:'IT-RA' }

export const generateRefNumber = (letter_type) => {
  const year = new Date().getFullYear()
  const counter = refCounters[letter_type] || 1
  const padded = String(counter).padStart(4,'0')
  refCounters[letter_type] = counter + 1
  return `${refPrefixes[letter_type]}-${year}-${padded}`
}

export const getLetters = () => letters
export const getLettersByWorker = (worker_id) => letters.filter(l => l.worker_id === worker_id)
export const addLetter = (letter) => { letters = [...letters, letter] }

export const getWorkerWarningLevel = (worker_id) => {
  const workerLetters = letters.filter(l => l.worker_id === worker_id && ['warning_1st','warning_2nd','warning_final'].includes(l.letter_type))
  if (workerLetters.some(l => l.letter_type === 'warning_final')) return 'final'
  if (workerLetters.some(l => l.letter_type === 'warning_2nd')) return 'second'
  if (workerLetters.some(l => l.letter_type === 'warning_1st')) return 'first'
  return 'none'
}

export const getNextWarningType = (worker_id) => {
  const level = getWorkerWarningLevel(worker_id)
  if (level === 'none') return 'warning_1st'
  if (level === 'first') return 'warning_2nd'
  if (level === 'second') return 'warning_final'
  return 'warning_final'
}

// Tasks
let tasks = [...mockTasks]

export const getTasks = () => tasks
export const getTasksByWorker = (worker_id) => tasks.filter(t => t.worker_id === worker_id)
export const getPendingTasks = () => tasks.filter(t => t.status === 'pending')
export const addTask = (task) => { tasks = [...tasks, task] }
export const completeTask = (id, completed_by) => {
  tasks = tasks.map(t => t.id === id ? { ...t, status:'completed', completed_at: TODAY, completed_by } : t)
}

export const addWorkerWithC3Task = (worker) => {
  addWorker(worker)
  if (worker.category !== 'Subcontract Worker') {
    addTask({
      id: makeId('task'),
      task_type: 'c3_card_request',
      worker_id: worker.id,
      worker_name: worker.full_name,
      worker_number: worker.worker_number,
      title: 'Request C3 payroll card',
      description: `New worker ${worker.full_name} (${worker.worker_number}) created. Submit C3 card application to payroll provider before first payroll run.`,
      status: 'pending',
      created_at: TODAY,
      completed_at: null,
      completed_by: null,
      priority: 'high'
    })
  }
}

// Offboarding
let offboarding = [...mockOffboarding]

const OFFBOARDING_CHECKLIST_ITEMS = [
  { key:'insurance_cancelled', label:'Medical insurance cancelled', required: true },
  { key:'c3_card_cancelled', label:'C3 payroll card cancelled', required: true },
  { key:'final_payslip_issued', label:'Final payslip issued', required: true },
  { key:'eos_calculated', label:'End of Service gratuity calculated & approved', required: true },
  { key:'exit_clearance_signed', label:'Exit clearance form signed by worker', required: true },
  { key:'visa_cancellation_initiated', label:'Visa cancellation initiated', required: true },
  { key:'labour_card_cancelled', label:'Labour card / permit cancelled', required: true },
  { key:'experience_letter_issued', label:'Experience letter issued', required: false },
]

export const OFFBOARDING_ITEMS = OFFBOARDING_CHECKLIST_ITEMS
export const getOffboarding = () => offboarding
export const getOffboardingByWorker = (worker_id) => offboarding.find(o => o.worker_id === worker_id)

export const initiateOffboarding = (worker_id, reason, last_working_date, initiated_by) => {
  const worker = getWorker(worker_id)
  if (!worker) return null
  const record = {
    id: makeId('off'),
    worker_id,
    worker_name: worker.full_name,
    worker_number: worker.worker_number,
    initiated_date: TODAY,
    initiated_by,
    reason,
    last_working_date,
    status: 'in_progress',
    checklist: Object.fromEntries(OFFBOARDING_CHECKLIST_ITEMS.map(item => [item.key, { done:false, done_by:null, done_at:null }])),
    notes: ''
  }
  offboarding = [...offboarding, record]
  return record
}

export const tickOffboardingItem = (offboarding_id, item_key, done_by) => {
  offboarding = offboarding.map(o => {
    if (o.id !== offboarding_id) return o
    return { ...o, checklist: { ...o.checklist, [item_key]: { done: true, done_by, done_at: TODAY } } }
  })
}

export const canCloseOffboarding = (offboarding_id) => {
  const record = offboarding.find(o => o.id === offboarding_id)
  if (!record) return { can: false, missing: [] }
  const missing = OFFBOARDING_CHECKLIST_ITEMS.filter(item => item.required && !record.checklist[item.key]?.done).map(item => item.label)
  return { can: missing.length === 0, missing }
}

export const closeOffboarding = (offboarding_id, done_by) => {
  const { can, missing } = canCloseOffboarding(offboarding_id)
  if (!can) return { success: false, missing }
  const record = offboarding.find(o => o.id === offboarding_id)
  offboarding = offboarding.map(o => o.id === offboarding_id ? {...o, status:'closed'} : o)
  updateWorker(record.worker_id, { active: false, status: 'Inactive', end_date: TODAY })
  return { success: true }
}

// Public holidays
let publicHolidays = [...mockPublicHolidays]
export const getPublicHolidays = () => publicHolidays
export const addPublicHoliday = (h) => { publicHolidays = [...publicHolidays, h] }
export const removePublicHoliday = (id) => { publicHolidays = publicHolidays.filter(h => h.id !== id) }
export const isPublicHoliday = (dateStr) => publicHolidays.some(h => h.date === dateStr)
export const getHolidayName = (dateStr) => publicHolidays.find(h => h.date === dateStr)?.name || null

// Ramadan mode
let ramadanMode = { active: false, start_date: null, end_date: null, activated_by: null, activated_at: null }
export const getRamadanMode = () => ramadanMode
export const setRamadanMode = (active, start_date, end_date, activated_by) => {
  ramadanMode = { active, start_date, end_date, activated_by, activated_at: active ? TODAY : null }
}
export const isRamadanDate = (dateStr) => {
  if (!ramadanMode.active || !ramadanMode.start_date || !ramadanMode.end_date) return false
  return dateStr >= ramadanMode.start_date && dateStr <= ramadanMode.end_date
}

// OT calculation helper
export const calculateHourlyPay = (worker, date, hours) => {
  const isFlat = worker.category === 'Contract Worker' || worker.category === 'Subcontract Worker'
  const rate = worker.hourly_rate || 0
  const holiday = isPublicHoliday(date)
  const ramadan = isRamadanDate(date)
  if (isFlat) {
    const effectiveRate = holiday ? rate * 1.5 : rate
    return { normal_hours: hours, ot_hours: 0, pay: Math.round(hours * effectiveRate * 100) / 100, rate_applied: effectiveRate }
  }
  const monthlyRate = worker.monthly_salary || 0
  const dailyRate = monthlyRate / 26
  const baseHourlyRate = dailyRate / 8
  const otThreshold = ramadan ? 6 : 8
  if (holiday) {
    return { normal_hours: 0, ot_hours: hours, pay: Math.round(hours * baseHourlyRate * 1.5 * 100) / 100, rate_applied: baseHourlyRate * 1.5 }
  }
  const normalHours = Math.min(hours, otThreshold)
  const otHours = Math.max(0, hours - otThreshold)
  const normalPay = normalHours * baseHourlyRate
  const otPay = otHours * baseHourlyRate * 1.25
  return { normal_hours: normalHours, ot_hours: otHours, pay: Math.round((normalPay + otPay) * 100) / 100, rate_applied: baseHourlyRate }
}

// Discrepancies
let timesheetDiscrepancies = []
export const getDiscrepancies = (header_id) => timesheetDiscrepancies.filter(d => d.header_id === header_id)
export const getAllDiscrepancies = () => timesheetDiscrepancies
export const addDiscrepancy = (d) => { timesheetDiscrepancies = [...timesheetDiscrepancies, d] }
export const resolveDiscrepancy = (id, resolved_by, resolution, use_client_hours) => {
  timesheetDiscrepancies = timesheetDiscrepancies.map(d =>
    d.id === id ? { ...d, status:'resolved', resolved_by, resolution, use_client_hours, resolved_at: TODAY } : d
  )
}
export const getPendingDiscrepancies = () => timesheetDiscrepancies.filter(d => d.status === 'pending')

// Auto file naming helper
export const generateDocFileName = (worker, document_type, original_extension) => {
  const safeName = (worker.full_name || '').replace(/\s+/g,'')
  const ext = original_extension || 'pdf'
  return `${worker.worker_number}_${safeName}_${document_type}.${ext}`
}

// Attendance
let attendance = [...mockAttendance]
export const getAttendance = () => attendance
export const addAttendanceRecord = (rec) => { attendance = [rec, ...attendance] }
export const getAttendanceByWorker = (worker_id) => attendance.filter(a => a.worker_id === worker_id)

// Penalty deductions
let penaltyDeductions = []
export const getPenaltyDeductions = () => penaltyDeductions
export const addPenaltyDeduction = (item) => { penaltyDeductions = [...penaltyDeductions, item] }
export const confirmPenaltyDeduction = (id) => { penaltyDeductions = penaltyDeductions.map(p => p.id === id ? {...p, status:'confirmed'} : p) }
export const removePenaltyDeduction = (id) => { penaltyDeductions = penaltyDeductions.filter(p => p.id !== id) }

// Offence count helper
export const getWorkerOffenceCount = (worker_id) => {
  const thirtyDaysAgo = new Date(TODAY)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return attendance.filter(a =>
    a.worker_id === worker_id &&
    a.reason !== 'sick_with_cert' &&
    new Date(a.date) >= thirtyDaysAgo
  ).length
}

// Derived metrics
export function getDashboardMetrics() {
  const activeWorkers = store.workers.filter(w => w.active)
  const today = new Date('2026-04-08')
  const in30 = new Date('2026-05-08')
  const in42 = new Date('2026-05-20')
  const expiredDocs = store.documents.filter(d => d.status === 'expired').length
  const expiringDocs = store.documents.filter(d => d.status === 'expiring_soon').length
  const missingDocs = store.documents.filter(d => d.status === 'missing').length
  const expiredCerts = store.certifications.filter(c => c.status === 'expired').length
  const expiringCerts = store.certifications.filter(c => c.status === 'expiring_soon').length
  const openWarnings = store.warnings.filter(w => w.status === 'open').length
  const pendingApprovals = store.timesheetHeaders.filter(h => h.final_approval_status === 'pending' || h.final_approval_status === 'pending_owner').length
  const contractsDue = store.documents.filter(d => d.document_type === 'employment_contract' && d.status === 'expiring_soon').length
  const packBlockers = getPackCoverage().filter(p => p.available_count < p.required_count).length
  const onboardingActive = store.onboardingRecords.filter(r => !r.documentation_complete).length
  return {
    activeWorkers: activeWorkers.length,
    siteWorkforce: activeWorkers.filter(w => w.category !== 'Office Staff').length,
    officeStaff: activeWorkers.filter(w => w.category === 'Office Staff').length,
    subcontractors: activeWorkers.filter(w => w.category === 'Subcontract Worker').length,
    expiredDocs, expiringDocs, missingDocs, expiredCerts, expiringCerts,
    openWarnings, pendingApprovals, contractsDue, packBlockers, onboardingActive,
    byCategory: {
      'Permanent Staff': store.workers.filter(w=>w.active&&w.category==='Permanent Staff').length,
      'Contract Worker': store.workers.filter(w=>w.active&&w.category==='Contract Worker').length,
      'Subcontractor': store.workers.filter(w=>w.active&&w.category==='Subcontractor').length,
      'Office Staff': store.workers.filter(w=>w.active&&w.category==='Office Staff').length,
    }
  }
}

export function getInboxItems() {
  const docs = store.documents
  const certs = store.certifications
  const workerMap = Object.fromEntries(store.workers.map(w => [w.id, w]))
  const enrich = (arr) => arr.map(item => ({ ...item, worker_name: workerMap[item.worker_id]?.full_name || 'Unknown', worker_number: workerMap[item.worker_id]?.worker_number || '-' }))
  return {
    missingDocs: enrich(docs.filter(d => d.status === 'missing')),
    expiredDocs: enrich(docs.filter(d => d.status === 'expired')),
    expiringDocs: enrich(docs.filter(d => d.status === 'expiring_soon' && d.document_type !== 'employment_contract')),
    contractsDue: enrich(docs.filter(d => d.document_type === 'employment_contract' && d.status === 'expiring_soon')),
    expiredCerts: enrich(certs.filter(c => c.status === 'expired')),
    expiringCerts: enrich(certs.filter(c => c.status === 'expiring_soon')),
    onboardingBlockers: store.onboardingRecords.filter(r => !r.documentation_complete).map(r => ({ ...r, worker_name: workerMap[r.worker_id]?.full_name || 'Unknown' })),
    openWarnings: store.warnings.filter(w => w.status === 'open'),
    pendingTimesheets: store.timesheetHeaders.filter(h => h.final_approval_status === 'pending' || h.final_approval_status === 'pending_owner'),
    packBlockers: getPackCoverage().filter(p => p.available_count < p.required_count),
    leaveRequests: store.leaveRecords.filter(l => l.status === 'pending'),
    pendingTasks: getPendingTasks().filter(t => t.task_type === 'c3_card_request'),
    pendingDiscrepancies: getPendingDiscrepancies()
  }
}

// ============================================
// WORKFORCE BREAKDOWN & ANALYTICS
// ============================================

// ILOE Insurance tracking
export function getILOEStatus(workerId) {
  const worker = store.workers.find(w => w.id === workerId)
  if (!worker) return null
  if (worker.iloe_status === 'not_required') return { status:'not_required', label:'Not Required (Subcontract)', tone:'neutral' }
  if (!worker.iloe_expiry) return { status:'missing', label:'No ILOE on file', tone:'danger', monthly_deduction:0 }
  const expiry = new Date(worker.iloe_expiry)
  const today = new Date(TODAY)
  const daysUntil = Math.ceil((expiry - today) / (1000*60*60*24))
  if (daysUntil < 0) return { status:'expired', label:'ILOE Expired', tone:'danger', expiry:worker.iloe_expiry, monthly_deduction:worker.iloe_monthly_deduction||0 }
  if (daysUntil <= 30) return { status:'expiring', label:'ILOE Expiring ('+daysUntil+' days)', tone:'warning', expiry:worker.iloe_expiry, monthly_deduction:worker.iloe_monthly_deduction||0 }
  return { status:'active', label:'ILOE Active', tone:'success', expiry:worker.iloe_expiry, provider:worker.iloe_provider, policy:worker.iloe_policy, monthly_deduction:worker.iloe_monthly_deduction||0, annual_cost:worker.iloe_annual_cost||0 }
}

export function getWorkersWithILOEIssues() {
  return store.workers.filter(w => w.active).map(w => ({ worker_id:w.id, worker_name:w.full_name, worker_number:w.worker_number, iloe: getILOEStatus(w.id) })).filter(w => w.iloe && (w.iloe.status === 'expired' || w.iloe.status === 'expiring' || w.iloe.status === 'missing'))
}

export function calculateLeaveBalance(workerId) {
  const worker = store.workers.find(w => w.id === workerId)
  if (!worker || !worker.joining_date) return null
  const joinDate = new Date(worker.joining_date)
  const today = new Date(TODAY)
  const monthsDiff = (today.getFullYear() - joinDate.getFullYear()) * 12 + (today.getMonth() - joinDate.getMonth())
  const accruedDays = Math.min(30, Math.max(0, monthsDiff * 2.5))
  const usedLeave = store.leaveRecords.filter(l => l.worker_id === workerId && l.leave_type === 'annual' && l.status === 'approved').reduce((sum, l) => sum + (l.days_count || 0), 0)
  const remainingDays = Math.max(0, accruedDays - usedLeave)
  return { accrued: Math.round(accruedDays * 10) / 10, used: usedLeave, remaining: Math.round(remainingDays * 10) / 10, months_of_service: monthsDiff, accrual_rate: 2.5, annual_entitlement: 30 }
}

export function getWorkforceBreakdown() {
  const active = store.workers.filter(w => w.active)
  return {
    total: active.length,
    direct: active.filter(w => w.category === 'Permanent Staff').length,
    hourly: active.filter(w => w.category === 'Contract Worker').length,
    subcontractor: active.filter(w => w.category === 'Subcontract Worker').length,
    office: active.filter(w => w.category === 'Office Staff').length,
  }
}

export function getSubcontractorsByCompany() {
  const subs = store.workers.filter(w => w.active && w.category === 'Subcontract Worker')
  const grouped = {}
  subs.forEach(worker => {
    const company = worker.subcontractor_company || 'Unknown Company'
    if (!grouped[company]) grouped[company] = []
    grouped[company].push(worker)
  })
  return Object.entries(grouped).map(([company, workers]) => ({
    company, workers, count: workers.length
  })).sort((a, b) => b.count - a.count)
}

export function getAbsentToday() {
  return attendance.filter(record => record.date === TODAY && record.reason !== 'sick_with_cert')
}

export function getAbsencePercentage(dateStr) {
  const activeCount = store.workers.filter(w => w.active).length
  if (activeCount === 0) return 0
  const absentCount = attendance.filter(r => r.date === (dateStr || TODAY)).length
  return Math.round((absentCount / activeCount) * 100)
}

export function getWeeklyAttendanceGrid(startDate) {
  const start = new Date(startDate)
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const dayRecords = attendance.filter(r => r.date === dateStr)
    days.push({ date: dateStr, dayName: d.toLocaleDateString('en-GB',{weekday:'short'}), records: dayRecords, absent: dayRecords.filter(r => r.reason === 'absent_no_cert').length, sick: dayRecords.filter(r => r.reason === 'sick_with_cert').length, late: dayRecords.filter(r => r.reason === 'late').length, total: dayRecords.length })
  }
  return days
}

export function getMonthlyAttendanceSummary(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthStr = `${year}-${String(month).padStart(2,'0')}`
  const monthRecords = attendance.filter(r => r.date.startsWith(monthStr))
  const byWorker = {}
  monthRecords.forEach(r => {
    if (!byWorker[r.worker_id]) byWorker[r.worker_id] = { worker_id:r.worker_id, worker_name:r.worker_name, worker_number:r.worker_number, absent:0, sick:0, late:0, total:0 }
    byWorker[r.worker_id].total++
    if (r.reason === 'absent_no_cert') byWorker[r.worker_id].absent++
    else if (r.reason === 'sick_with_cert') byWorker[r.worker_id].sick++
    else if (r.reason === 'late') byWorker[r.worker_id].late++
  })
  return { month:monthStr, daysInMonth, totalRecords:monthRecords.length, byWorker:Object.values(byWorker).sort((a,b) => b.total - a.total) }
}

export function getAttendanceByWorkerSummary(workerId) {
  const records = attendance.filter(r => r.worker_id === workerId)
  return { total:records.length, absent:records.filter(r=>r.reason==='absent_no_cert').length, sick:records.filter(r=>r.reason==='sick_with_cert').length, late:records.filter(r=>r.reason==='late').length, penalties:records.filter(r=>r.offence_number>=2).length, records }
}

export function getInsuranceCoverageCount() {
  const activeWorkers = store.workers.filter(w => w.active)
  let coveredCount = 0
  activeWorkers.forEach(worker => {
    const insuranceDoc = store.documents.find(doc =>
      doc.worker_id === worker.id &&
      doc.document_type === 'medical_insurance' &&
      doc.status === 'valid'
    )
    if (insuranceDoc) coveredCount++
  })
  return {
    covered: coveredCount,
    total: activeWorkers.length,
    percentage: activeWorkers.length > 0 ? Math.round((coveredCount / activeWorkers.length) * 100) : 0
  }
}

export function getWorkforceSnapshotOnDate(dateString) {
  const targetDate = new Date(dateString)
  return store.workers.filter(worker => {
    const joinDate = new Date(worker.joining_date)
    const endDate = worker.end_date ? new Date(worker.end_date) : null
    return joinDate <= targetDate && (!endDate || endDate > targetDate)
  })
}

export function getLetterRegister() {
  const grouped = { offer_letter:[], warning_1st:[], warning_2nd:[], warning_final:[], experience_letter:[], termination_notice:[], termination_no_notice:[], resignation_acceptance:[], memo:[] }
  letters.forEach(letter => { if (grouped[letter.letter_type]) grouped[letter.letter_type].push(letter) })
  Object.keys(grouped).forEach(type => { grouped[type].sort((a, b) => new Date(b.issued_date) - new Date(a.issued_date)) })
  return grouped
}

export function getLetterStats() {
  return {
    total: letters.length,
    offer: letters.filter(l => l.letter_type === 'offer_letter').length,
    warning: letters.filter(l => l.letter_type.startsWith('warning_')).length,
    experience: letters.filter(l => l.letter_type === 'experience_letter').length,
    termination: letters.filter(l => l.letter_type.includes('termination')).length,
    resignation: letters.filter(l => l.letter_type === 'resignation_acceptance').length
  }
}

export function getPackCoverage() {
  const requiredTypes = ['passport', 'emirates_id', 'medical_insurance', 'workers_compensation', 'certificates', 'photo', 'cv']
  return store.workers.filter(w => w.active).map(worker => {
    const workerDocs = store.documents.filter(d => d.worker_id === worker.id)
    const availableTypes = workerDocs.filter(d => d.status === 'valid' || d.status === 'expiring_soon').map(d => d.document_type)
    const available_count = requiredTypes.filter(t => availableTypes.includes(t)).length
    const missing_types = requiredTypes.filter(t => !availableTypes.includes(t))
    return { worker_id: worker.id, worker_name: worker.full_name, worker_number: worker.worker_number, category: worker.category, available_count, required_count: requiredTypes.length, missing_types }
  })
}

// ============================================
// APPROVAL SYSTEM
// ============================================

export function getPendingApprovalsForRole(role) {
  const approvals = { timesheets:[], payroll:[], warnings:[], terminations:[], leave:[] }
  if (role === 'hr_admin' || role === 'owner') {
    approvals.leave = store.leaveRecords.filter(l => l.status === 'pending')
  }
  if (role === 'operations' || role === 'owner') {
    approvals.timesheets = store.timesheetHeaders.filter(h => h.operations_check_status === 'pending')
    if (store.payrollBatches[0]?.operations_approval_status === 'pending') approvals.payroll = [store.payrollBatches[0]]
    approvals.warnings = store.warnings.filter(w => w.requires_operations_approval && w.operations_approval_status === 'pending')
    approvals.terminations = offboarding.filter(o => o.requires_operations_approval && o.operations_approval_status === 'pending')
  }
  if (role === 'owner') {
    approvals.payroll = (store.payrollBatches[0]?.operations_approval_status === 'approved' && store.payrollBatches[0]?.owner_approval_status === 'pending') ? [store.payrollBatches[0]] : approvals.payroll
    approvals.warnings = [...approvals.warnings, ...store.warnings.filter(w => w.requires_owner_approval && w.operations_approval_status === 'approved' && w.owner_approval_status === 'pending')]
    approvals.terminations = [...approvals.terminations, ...offboarding.filter(o => o.requires_owner_approval && o.operations_approval_status === 'approved' && o.owner_approval_status === 'pending')]
  }
  return approvals
}

export function approveTimesheet(headerId, role, userName) {
  const idx = store.timesheetHeaders.findIndex(h => h.id === headerId)
  if (idx === -1) return { success:false }
  if (role === 'operations') { store.timesheetHeaders[idx] = {...store.timesheetHeaders[idx], operations_check_status:'checked', operations_checked_by:userName, operations_checked_at:TODAY} }
  else if (role === 'owner') { store.timesheetHeaders[idx] = {...store.timesheetHeaders[idx], owner_approval_status:'approved', owner_approved_by:userName, owner_approved_at:TODAY, final_approval_status:'approved'} }
  return { success:true }
}

export function rejectTimesheet(headerId, role, userName, reason) {
  const idx = store.timesheetHeaders.findIndex(h => h.id === headerId)
  if (idx === -1) return { success:false }
  if (role === 'operations') { store.timesheetHeaders[idx] = {...store.timesheetHeaders[idx], operations_check_status:'rejected', operations_checked_by:userName} }
  else if (role === 'owner') { store.timesheetHeaders[idx] = {...store.timesheetHeaders[idx], owner_approval_status:'rejected', owner_approved_by:userName, final_approval_status:'rejected'} }
  return { success:true }
}

export function approvePayrollBatch(role, userName) {
  if (!store.payrollBatches[0]) return { success:false }
  if (role === 'operations') { store.payrollBatches[0] = {...store.payrollBatches[0], operations_approval_status:'approved', operations_approved_by:userName, operations_approved_at:TODAY} }
  else if (role === 'owner') {
    store.payrollBatches[0] = {...store.payrollBatches[0], owner_approval_status:'approved', owner_approved_by:userName, owner_approved_at:TODAY}
    if (store.payrollBatches[0].operations_approval_status === 'approved') store.payrollBatches[0].can_distribute = true
  }
  return { success:true }
}

export function rejectPayrollBatch(role, userName, reason) {
  if (!store.payrollBatches[0]) return { success:false }
  if (role === 'operations') { store.payrollBatches[0] = {...store.payrollBatches[0], operations_approval_status:'rejected', operations_approved_by:userName, operations_rejection_reason:reason} }
  else if (role === 'owner') { store.payrollBatches[0] = {...store.payrollBatches[0], owner_approval_status:'rejected', owner_approved_by:userName, owner_rejection_reason:reason} }
  return { success:true }
}

export function approveWarning(warningId, role, userName) {
  const idx = store.warnings.findIndex(w => w.id === warningId)
  if (idx === -1) return { success:false }
  if (role === 'operations') { store.warnings[idx] = {...store.warnings[idx], operations_approval_status:'approved', operations_approved_by:userName} }
  else if (role === 'owner') {
    store.warnings[idx] = {...store.warnings[idx], owner_approval_status:'approved', owner_approved_by:userName}
    if (store.warnings[idx].operations_approval_status === 'approved') store.warnings[idx].can_issue_letter = true
  }
  return { success:true }
}

export function rejectWarning(warningId, role, userName, reason) {
  const idx = store.warnings.findIndex(w => w.id === warningId)
  if (idx === -1) return { success:false }
  if (role === 'operations') { store.warnings[idx] = {...store.warnings[idx], operations_approval_status:'rejected', operations_approved_by:userName} }
  else if (role === 'owner') { store.warnings[idx] = {...store.warnings[idx], owner_approval_status:'rejected', owner_approved_by:userName} }
  return { success:true }
}

export function approveTermination(offboardingId, role, userName) {
  offboarding = offboarding.map(o => {
    if (o.id !== offboardingId) return o
    if (role === 'operations') return {...o, operations_approval_status:'approved', operations_approved_by:userName}
    if (role === 'owner') {
      const updated = {...o, owner_approval_status:'approved', owner_approved_by:userName}
      if (updated.operations_approval_status === 'approved') updated.can_proceed_with_exit = true
      return updated
    }
    return o
  })
  return { success:true }
}

export function rejectTermination(offboardingId, role, userName, reason) {
  offboarding = offboarding.map(o => {
    if (o.id !== offboardingId) return o
    if (role === 'operations') return {...o, operations_approval_status:'rejected', operations_approved_by:userName, operations_rejection_reason:reason}
    if (role === 'owner') return {...o, owner_approval_status:'rejected', owner_approved_by:userName, owner_rejection_reason:reason}
    return o
  })
  return { success:true }
}

// ============================================
// PAYROLL MONTH MANAGEMENT + LOCKING
// ============================================

export function getAllPayrollBatches() {
  return store.payrollBatches.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.month_number - a.month_number
  })
}

export function getPayrollBatchByMonth(month) {
  return store.payrollBatches.find(b => b.month === month) || null
}

export function getPayrollLinesByBatch(batchId) {
  return store.payrollLines.filter(l => l.batch_id === batchId)
}

export function canEditPayrollBatch(batchId) {
  const batch = store.payrollBatches.find(b => b.id === batchId)
  return batch ? !batch.locked : false
}

export function lockPayrollBatch(batchId) {
  const idx = store.payrollBatches.findIndex(b => b.id === batchId)
  if (idx === -1 || store.payrollBatches[idx].locked) return { success:false }
  store.payrollBatches[idx] = {...store.payrollBatches[idx], locked:true, locked_at:new Date().toISOString(), locked_by:'System (Owner Approval)', status:'locked'}
  return { success:true }
}

export function unlockPayrollBatch(batchId, ownerName, reason) {
  const idx = store.payrollBatches.findIndex(b => b.id === batchId)
  if (idx === -1 || !store.payrollBatches[idx].locked) return { success:false }
  store.payrollBatches[idx] = {...store.payrollBatches[idx], locked:false, unlocked_by_owner:ownerName, unlocked_at:new Date().toISOString(), unlock_reason:reason, status:'ready_for_review', operations_approval_status:'pending', operations_approved_by:null, owner_approval_status:'pending', owner_approved_by:null}
  return { success:true }
}

export function addCorrectionNote(batchId, note, userName) {
  const idx = store.payrollBatches.findIndex(b => b.id === batchId)
  if (idx === -1) return { success:false }
  store.payrollBatches[idx].correction_notes = [...(store.payrollBatches[idx].correction_notes||[]), {note, added_by:userName, added_at:new Date().toISOString()}]
  return { success:true }
}

export function approvePayrollBatchOwner(batchId, ownerName) {
  const idx = store.payrollBatches.findIndex(b => b.id === batchId)
  if (idx === -1) return { success:false }
  store.payrollBatches[idx] = {...store.payrollBatches[idx], owner_approval_status:'approved', owner_approved_by:ownerName, owner_approved_at:new Date().toISOString()}
  if (store.payrollBatches[idx].operations_approval_status === 'approved') store.payrollBatches[idx].can_distribute = true
  lockPayrollBatch(batchId)
  return { success:true }
}

export function getWorkerDisplay(workerId) {
  const worker = store.workers.find(w => w.id === workerId || w.worker_number === workerId)
  if (!worker) return { id:workerId, full_id:workerId, name:'Unknown Worker', display:workerId+' (Unknown)', name_primary:'Unknown Worker', id_secondary:workerId }
  return { id:worker.id, full_id:worker.worker_number, name:worker.full_name, display:worker.full_name+' ('+worker.worker_number+')', name_primary:worker.full_name, id_secondary:worker.worker_number }
}
