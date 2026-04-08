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
