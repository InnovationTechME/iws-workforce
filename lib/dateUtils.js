/**
 * Day classification utility for the master timesheet grid.
 * Pure functions — no React, no Supabase.
 *
 * Per IWS_RULES_LOCKED.md §2:
 *   - Innovation workweek: Mon–Sat (6 days, 8 hours/day)
 *   - Default rest day: Sunday
 *   - Per-worker override: Saturday
 *   - Friday is a NORMAL working day
 *
 * Expected behaviour:
 *   classifyDay('2026-03-30', 'sunday', holidays) → 'public_holiday' (Eid Al Fitr Day 1)
 *   classifyDay('2026-04-05', 'sunday', holidays) → 'rest_day' (Sunday)
 *   classifyDay('2026-04-04', 'saturday', holidays) → 'rest_day' (Saturday override)
 *   classifyDay('2026-04-06', 'sunday', holidays) → 'working' (Monday)
 *   classifyDay('2026-04-03', 'sunday', holidays) → 'working' (Friday — normal at Innovation)
 */

/**
 * Classify a calendar day for a specific worker.
 * @param {Date|string} workDate - date as 'YYYY-MM-DD' string or Date object
 * @param {string} workerRestDay - 'sunday' (default) or 'saturday'
 * @param {Array<{date: string, name: string}>} publicHolidays - holidays with date in 'YYYY-MM-DD'
 * @returns {'working'|'rest_day'|'public_holiday'}
 */
export function classifyDay(workDate, workerRestDay, publicHolidays) {
  const d = typeof workDate === 'string' ? new Date(workDate + 'T00:00:00') : workDate
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const dateStr = `${yyyy}-${mm}-${dd}`

  // Public holidays take precedence over rest day
  if (publicHolidays && publicHolidays.some(h => h.date === dateStr)) {
    return 'public_holiday'
  }

  // Rest day check: 0 = Sunday, 6 = Saturday
  const dayOfWeek = d.getDay()
  if (workerRestDay === 'sunday' && dayOfWeek === 0) return 'rest_day'
  if (workerRestDay === 'saturday' && dayOfWeek === 6) return 'rest_day'

  return 'working'
}

/**
 * Get the public holiday name for a given date, or null.
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {Array<{date: string, name: string}>} publicHolidays
 * @returns {string|null}
 */
export function getHolidayName(dateStr, publicHolidays) {
  const h = publicHolidays?.find(h => h.date === dateStr)
  return h ? h.name : null
}

/**
 * Get number of days in a given month.
 * @param {number} month - 1-based (1=Jan, 12=Dec)
 * @param {number} year
 * @returns {number}
 */
export function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate()
}

/**
 * Format a day number + month/year into a 'YYYY-MM-DD' string.
 * @param {number} day - 1-based
 * @param {number} month - 1-based
 * @param {number} year
 * @returns {string}
 */
export function formatDateStr(day, month, year) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
