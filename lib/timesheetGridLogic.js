/**
 * Timesheet grid split logic + conflict detection.
 * Pure functions — no React, no Supabase.
 *
 * Per IWS_RULES_LOCKED.md §3 and §4:
 *   - Working day (non-Ramadan): 8hr threshold. 0-8 normal, >8 OT1.
 *   - Working day (Ramadan):     6hr threshold. 0-6 normal, >6 OT1.
 *   - Rest day / public holiday: all hours → holiday_hours (OT2 at payroll time).
 *   - 16hr hard cap.
 *   - <4hr on working day → conflict (potential unauthorised absence).
 *
 * Per §4.6 examples:
 *   splitHours(10, 'working', false)         → { normal: 8, ot: 2, holiday: 0 }
 *   splitHours(7,  'working', true)          → { normal: 6, ot: 1, holiday: 0 }
 *   splitHours(10, 'rest_day', false)        → { normal: 0, ot: 0, holiday: 10 }
 *   splitHours(8,  'public_holiday', false)  → { normal: 0, ot: 0, holiday: 8 }
 *   splitHours(10, 'working', false)         → { normal: 8, ot: 2, holiday: 0 } (Friday)
 */

/**
 * Split total hours into normal / OT / holiday buckets.
 * @param {number} totalHours - HR-entered total (should already be capped at 16)
 * @param {'working'|'rest_day'|'public_holiday'} dayType
 * @param {boolean} ramadanMode
 * @returns {{ normal_hours: number, ot_hours: number, holiday_hours: number }}
 */
export function splitHours(totalHours, dayType, ramadanMode) {
  const hrs = Math.max(0, totalHours || 0)
  if (hrs <= 0) return { normal_hours: 0, ot_hours: 0, holiday_hours: 0 }

  if (dayType === 'rest_day' || dayType === 'public_holiday') {
    return { normal_hours: 0, ot_hours: 0, holiday_hours: hrs }
  }

  // Working day
  const threshold = ramadanMode ? 6 : 8
  const normal = Math.min(hrs, threshold)
  const ot = Math.round((hrs - normal) * 10) / 10
  return {
    normal_hours: Math.round(normal * 10) / 10,
    ot_hours: ot,
    holiday_hours: 0
  }
}

/**
 * Detect if a cell is in conflict (working day + hours < 4).
 * Rest days and public holidays are exempt — any value (including 0) is OK.
 * @param {number|null|undefined} totalHours
 * @param {'working'|'rest_day'|'public_holiday'} dayType
 * @returns {boolean} true if conflict
 */
export function detectConflict(totalHours, dayType) {
  if (dayType === 'rest_day' || dayType === 'public_holiday') return false
  const hrs = totalHours === null || totalHours === undefined ? -1 : Number(totalHours)
  return hrs >= 0 && hrs < 4
}

/**
 * Cap hours to 0-16 range, round to 1 decimal place.
 * @param {string|number} input
 * @returns {number}
 */
export function capHours(input) {
  let v = parseFloat(input)
  if (isNaN(v) || v < 0) return 0
  if (v > 16) v = 16
  return Math.round(v * 10) / 10
}
