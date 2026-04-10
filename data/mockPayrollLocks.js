export const mockPayrollLocks = [
  { id:'lock-001', month:'January', year:'2026', client:'ADSB', locked:true, locked_by:'Owner', locked_date:'2026-02-05', payroll_approved:true },
  { id:'lock-002', month:'February', year:'2026', client:'ADSB', locked:true, locked_by:'Owner', locked_date:'2026-03-06', payroll_approved:true },
]

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export function isMonthLocked(month, year, client) {
  return mockPayrollLocks.some(l => l.month === month && l.year === String(year) && l.client === client && l.locked)
}

export function canUploadTimesheet(month, year, client) {
  if (isMonthLocked(month, year, client)) return { allowed:false, reason:'Month is locked — payroll already approved and distributed' }
  const now = new Date()
  const mi = MONTH_NAMES.indexOf(month)
  const ci = now.getMonth()
  const cy = now.getFullYear()
  const y = parseInt(year)
  if (y > cy || (y === cy && mi >= ci)) return { allowed:false, reason:'Cannot upload timesheet for current or future months' }
  return { allowed:true }
}

export function lockMonth(month, year, client, lockedBy) {
  mockPayrollLocks.push({ id:'lock-'+Date.now(), month, year:String(year), client, locked:true, locked_by:lockedBy, locked_date:new Date().toISOString().split('T')[0], payroll_approved:true })
}
