export const TODAY = '2026-04-08'

export function formatCurrency(amount) {
  if (!amount && amount !== 0) return 'AED 0.00'
  return 'AED ' + Number(amount).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
}

export function getDaysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date(TODAY)
  const target = new Date(dateStr)
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
}

export function getDocumentStatus(expiryDate, docType) {
  if (!expiryDate) return 'missing'
  const days = getDaysUntil(expiryDate)
  if (days < 0) return 'expired'
  const warningDays = docType === 'employment_contract' ? 42 : 30
  if (days <= warningDays) return 'expiring_soon'
  return 'valid'
}

export function getStatusTone(status) {
  const map = { expired:'danger', expiring_soon:'warning', missing:'danger', valid:'success', pending:'neutral', active:'success', inactive:'neutral', 'on leave':'warning', open:'danger', monitoring:'warning', closed:'success', draft:'neutral', sent:'info', signed:'success', rescinded:'danger', approved:'success', rejected:'danger' }
  return map[status?.toLowerCase()] || 'neutral'
}

export function calculateOTRates(salary, type) {
  if (type === 'monthly') {
    const h = salary / 30 / 8
    return { hourlyEquiv: round2(h), ot125: round2(h * 1.25), ot150: round2(h * 1.5) }
  }
  return { hourlyEquiv: salary, ot125: round2(salary * 1.25), ot150: round2(salary * 1.5) }
}

export function round2(n) { return Math.round(n * 100) / 100 }

export function truncate(str, n) { return str && str.length > n ? str.slice(0, n) + '...' : str }

export const validateRequired = (fields) => {
  return fields
    .filter(f => !f.value || String(f.value).trim() === '')
    .map(f => `${f.label} is required`)
}

export const validateDateNotPast = (dateStr, label) => {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const today = new Date(TODAY)
  if (d < today) return `${label} is in the past — please verify`
  return null
}

export const validateExpiryAfterIssue = (issueDate, expiryDate) => {
  if (!issueDate || !expiryDate) return null
  if (new Date(expiryDate) <= new Date(issueDate)) return 'Expiry date must be after issue date'
  return null
}

// Passport expiry must be at least `minMonths` after the worker's joining date
// (§5.3.6 — default 7 months, needed for UAE residency visa issuance).
// Returns { ok: boolean, reason?, monthsFromJoining?, threshold? }.
export const passportExpiryGap = (expiryISO, joiningISO, minMonths = 7) => {
  if (!expiryISO || !joiningISO) return { ok: false, reason: 'missing' }
  const expiry = new Date(expiryISO)
  const joining = new Date(joiningISO)
  if (Number.isNaN(expiry.getTime()) || Number.isNaN(joining.getTime())) {
    return { ok: false, reason: 'invalid' }
  }
  const threshold = new Date(joining)
  threshold.setMonth(threshold.getMonth() + minMonths)
  if (expiry < threshold) {
    const months = (expiry - joining) / (1000 * 60 * 60 * 24 * 30.44)
    return {
      ok: false,
      reason: 'too_soon',
      monthsFromJoining: Math.max(0, Math.round(months * 10) / 10),
      threshold: threshold.toISOString().split('T')[0]
    }
  }
  return { ok: true }
}

// §5.3.5 / PR #4 correction: reject offers whose candidate name is actually
// the company name. Case-insensitive contains-match on the known patterns.
const COMPANY_NAME_PATTERNS = ['innovation technologies', 'innovation llc', 'innovation tech']
export const looksLikeCompanyName = (name) => {
  if (!name) return false
  const n = String(name).toLowerCase()
  return COMPANY_NAME_PATTERNS.some(p => n.includes(p))
}

export const getDailyRate = (worker) => {
  if (!worker) return 0
  if (worker.payroll_type === 'monthly') return Math.round((worker.monthly_salary / 26) * 100) / 100
  return Math.round((worker.hourly_rate * 8) * 100) / 100
}
