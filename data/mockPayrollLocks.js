// data/mockPayrollLocks.js
// Real locking check — queries payroll_batches via Supabase.
// Delete this file when app/timesheets/page.js is migrated to use payrollService directly.

import { supabase } from '../lib/supabaseClient'

export const mockPayrollLocks = []

export async function isMonthLocked(month, year) {
  // month can be a name string ("March") or a number (3)
  let monthNum = month
  if (typeof month === 'string') {
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
    monthNum = MONTHS.indexOf(month) + 1
    if (monthNum === 0) return false
  }
  let yearNum = typeof year === 'string' ? parseInt(year, 10) : year
  const { data, error } = await supabase
    .from('payroll_batches')
    .select('id, status')
    .eq('month', monthNum)
    .eq('year', yearNum)
    .eq('status', 'locked')
    .maybeSingle()
  if (error) { console.error('isMonthLocked error:', error); return false }
  return data !== null
}

export function canUploadTimesheet(_month, _year, _client) { return { allowed: true } }
