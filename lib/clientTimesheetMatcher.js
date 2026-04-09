/**
 * Client Timesheet Auto-Matching System
 */

import { getWorkers, isPublicHoliday } from './mockStore'

function levenshteinDistance(s1, s2) {
  const m = []
  for (let i = 0; i <= s2.length; i++) m[i] = [i]
  for (let j = 0; j <= s1.length; j++) m[0][j] = j
  for (let i = 1; i <= s2.length; i++)
    for (let j = 1; j <= s1.length; j++)
      m[i][j] = s2[i-1] === s1[j-1] ? m[i-1][j-1] : Math.min(m[i-1][j-1]+1, m[i][j-1]+1, m[i-1][j]+1)
  return m[s2.length][s1.length]
}

function fuzzyMatch(str1, str2) {
  const s1 = str1.toLowerCase().replace(/[^a-z]/g, '')
  const s2 = str2.toLowerCase().replace(/[^a-z]/g, '')
  if (s1 === s2) return 1.0
  const longer = s1.length > s2.length ? s1 : s2
  if (longer.length === 0) return 1.0
  return (longer.length - levenshteinDistance(longer, s1.length > s2.length ? s2 : s1)) / longer.length
}

export function matchClientWorker(clientWorkerId, clientWorkerName, clientName = 'default') {
  const workers = getWorkers()
  // Step 1: exact match on client_worker_ids
  let matched = workers.find(w => w.client_worker_ids && (w.client_worker_ids[clientName] === clientWorkerId || w.client_worker_ids['default'] === clientWorkerId))
  if (matched) return { matched:true, worker:matched, match_method:'client_id_exact', confidence:1.0 }
  // Step 2: fuzzy name match
  let bestMatch = null, bestScore = 0
  workers.forEach(w => { const s = fuzzyMatch(w.full_name, clientWorkerName); if (s > bestScore) { bestScore = s; bestMatch = w } })
  if (bestScore >= 0.85) return { matched:true, worker:bestMatch, match_method:'name_fuzzy', confidence:bestScore }
  // Step 3: no match
  return { matched:false, worker:null, match_method:'no_match', confidence:0,
    suggestions: workers.map(w => ({worker:w, score:fuzzyMatch(w.full_name, clientWorkerName)})).sort((a,b) => b.score - a.score).slice(0,3).map(s => s.worker) }
}

export function splitHoursIntoNormalAndOT(totalHours, workDate, isRamadan = false) {
  const dateStr = typeof workDate === 'string' ? workDate : new Date(workDate).toISOString().split('T')[0]
  const holiday = isPublicHoliday(dateStr)
  const threshold = isRamadan ? 6 : 8
  if (holiday) return { normal_hours:0, ot_hours:0, holiday_hours:totalHours, rate_multiplier:1.5, note:'Public holiday — all hours at 150%' }
  if (totalHours <= threshold) return { normal_hours:totalHours, ot_hours:0, holiday_hours:0, rate_multiplier:1.0, note:`Within ${threshold}hr threshold` }
  return { normal_hours:threshold, ot_hours:totalHours - threshold, holiday_hours:0, rate_multiplier:1.0, ot_multiplier:1.25, note:`Split: ${threshold}hr normal + ${(totalHours - threshold).toFixed(1)}hr OT` }
}

export function processClientTimesheetRow(row, clientName, isRamadan = false) {
  const matchResult = matchClientWorker(row.client_worker_id, row.client_worker_name, clientName)
  if (!matchResult.matched) return { success:false, error:'No worker match found', client_data:row, suggestions:matchResult.suggestions }
  const hoursSplit = splitHoursIntoNormalAndOT(row.total_hours, row.work_date, isRamadan)
  return {
    success:true, matched_worker:matchResult.worker, match_confidence:matchResult.confidence, match_method:matchResult.match_method,
    timesheet_line: { worker_id:matchResult.worker.id, worker_number:matchResult.worker.worker_number, worker_name:matchResult.worker.full_name, work_date:row.work_date, total_hours:row.total_hours, normal_hours:hoursSplit.normal_hours, ot_hours:hoursSplit.ot_hours, holiday_hours:hoursSplit.holiday_hours, source:'client_upload', client_worker_id:row.client_worker_id, client_worker_name:row.client_worker_name, note:hoursSplit.note },
    client_data:row
  }
}

export function processClientTimesheet(clientRows, clientName, isRamadan = false) {
  const results = { total_rows:clientRows.length, matched:[], unmatched:[] }
  clientRows.forEach(row => {
    const processed = processClientTimesheetRow(row, clientName, isRamadan)
    if (processed.success) results.matched.push(processed)
    else results.unmatched.push(processed)
  })
  return results
}

export function generateClientWorkerMapping(clientName = 'default') {
  return getWorkers().filter(w => w.client_worker_ids).map(w => ({
    iws_id:w.worker_number, iws_name:w.full_name,
    client_id:w.client_worker_ids[clientName]||w.client_worker_ids['default'], client_name:clientName
  }))
}
