/**
 * Excel Parser for Client Timesheets
 * Supports simple format: ID | Name | Trade | Day1...Day31 | Total
 */

export async function parseClientTimesheet(file) {
  const XLSX = await import('xlsx')
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

  const result = { format: 'simple', month: null, year: null, workers: [] }

  // Try to detect month/year from first few rows
  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    const rowText = (jsonData[i] || []).join(' ')
    const monthMatch = rowText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{4})/i)
    if (monthMatch) { result.month = monthMatch[1]; result.year = monthMatch[2]; break }
  }

  // Find header row (has day numbers 1-31 or "1", "2", etc.)
  let headerRowIndex = -1
  let dateColStart = 3
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i] || []
    let dayCount = 0
    for (let j = 2; j < row.length; j++) {
      const val = typeof row[j] === 'number' ? row[j] : parseInt(String(row[j]))
      if (val >= 1 && val <= 31) dayCount++
    }
    if (dayCount >= 5) { headerRowIndex = i; break }
  }

  if (headerRowIndex === -1) {
    // Fallback: assume row 0 is header, data starts row 1
    headerRowIndex = 0
  }

  // Find where day columns start
  const headerRow = jsonData[headerRowIndex] || []
  for (let j = 0; j < headerRow.length; j++) {
    const val = typeof headerRow[j] === 'number' ? headerRow[j] : parseInt(String(headerRow[j]))
    if (val === 1) { dateColStart = j; break }
  }

  // Find where day columns end (before "Grand Total" or "Total")
  let dateColEnd = headerRow.length
  for (let j = dateColStart; j < headerRow.length; j++) {
    const cell = String(headerRow[j] || '').toLowerCase()
    if (cell.includes('total') || cell.includes('grand')) { dateColEnd = j; break }
  }

  const daysCount = dateColEnd - dateColStart

  // Parse worker rows
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i] || []
    if (!row[0] && !row[1]) continue // skip empty rows

    const clientId = String(row[0] || '').trim()
    const name = String(row[1] || '').trim()
    const trade = String(row[2] || '').trim()

    if (!name || name.toLowerCase().includes('total') || name.toLowerCase().includes('grand')) continue

    const dailyHours = []
    for (let j = dateColStart; j < dateColEnd; j++) {
      dailyHours.push(parseFloat(row[j]) || 0)
    }

    // Pad to consistent length
    while (dailyHours.length < 31) dailyHours.push(0)

    result.workers.push({ client_worker_id: clientId, worker_name: name, trade, daily_hours: dailyHours.slice(0, Math.max(daysCount, 28)) })
  }

  return result
}

export function validateTimesheetMonth(parsedData, selectedMonth, selectedYear) {
  if (!parsedData.month || !parsedData.year) {
    return { valid: false, warning: 'Could not detect month/year from file. Please verify manually.', file_month: 'Unknown', selected_month: selectedMonth + ' ' + selectedYear }
  }
  if (parsedData.month.toLowerCase() !== selectedMonth.toLowerCase() || parsedData.year !== String(selectedYear)) {
    return { valid: false, error: `File shows ${parsedData.month} ${parsedData.year}, but you selected ${selectedMonth} ${selectedYear}`, file_month: parsedData.month + ' ' + parsedData.year, selected_month: selectedMonth + ' ' + selectedYear }
  }
  return { valid: true, file_month: parsedData.month + ' ' + parsedData.year, selected_month: selectedMonth + ' ' + selectedYear }
}
