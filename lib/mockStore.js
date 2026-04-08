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
    subcontractors: activeWorkers.filter(w => w.category === 'Subcontractor').length,
    expiredDocs, expiringDocs, missingDocs, expiredCerts, expiringCerts,
    openWarnings, pendingApprovals, contractsDue, packBlockers, onboardingActive
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
    leaveRequests: store.leaveRecords.filter(l => l.status === 'pending')
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
