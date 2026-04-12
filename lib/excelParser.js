/**
 * Excel Parser for Client Timesheets
 * Supports Innovation Technologies format and generic formats
 */

const SPECIAL_VALUES = {
  'S/O': { hours: 0, note: 'rest_day' },
  'SO': { hours: 0, note: 'rest_day' },
  'A': { hours: 0, note: 'absent_no_cert' },
  'MC': { hours: 0, note: 'sick_with_cert' },
  'MC?': { hours: 0, note: 'sick_cert_query' },
  'ID': { hours: 0, note: 'id_renewal' },
  'OFF': { hours: 0, note: 'day_off' },
  'NW': { hours: 0, note: 'not_working' },
  'L': { hours: 0, note: 'leave' }
}

export async function parseClientTimesheet(file) {
  const XLSX = await import('xlsx')
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

  const result = { format: 'auto', month: null, year: null, client_name: sheetName || 'Innovation Direct', workers: [], total_workers: 0, total_hours: 0 }

  // Try to detect month/year from first few rows
  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    const rowText = (jsonData[i] || []).join(' ')
    // Innovation format: "Payroll Period: February 1-28, 2026"
    const periodMatch = rowText.match(/(\w+)\s+\d+-\d+,?\s*(\d{4})/)
    if (periodMatch) { result.month = periodMatch[1]; result.year = periodMatch[2]; break }
    const monthMatch = rowText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{4})/i)
    if (monthMatch) { result.month = monthMatch[1]; result.year = monthMatch[2]; break }
  }

  // Find header row — look for 'Workers Names', 'Name of Employee', or day number columns
  let headerRowIndex = -1
  let nameCol = 1
  let tradeCol = 2
  let dateColStart = 3

  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i] || []
    const rowStr = row.map(c => String(c || '').toLowerCase()).join('|')
    if (rowStr.includes('workers names') || rowStr.includes('name of employee') || rowStr.includes('worker name')) {
      headerRowIndex = i
      // Find which column has the name
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').toLowerCase()
        if (cell.includes('workers names') || cell.includes('name of employee') || cell.includes('worker name')) { nameCol = j; break }
      }
      // Trade is typically the next column
      tradeCol = nameCol + 1
      break
    }
  }

  // If no header found by name, try day-number detection
  if (headerRowIndex === -1) {
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const row = jsonData[i] || []
      let dayCount = 0
      for (let j = 2; j < row.length; j++) {
        const val = typeof row[j] === 'number' ? row[j] : parseInt(String(row[j]))
        if (val >= 1 && val <= 31) dayCount++
      }
      if (dayCount >= 5) { headerRowIndex = i; break }
    }
  }

  if (headerRowIndex === -1) headerRowIndex = 0

  // Find where day columns start (first column with value 1)
  const headerRow = jsonData[headerRowIndex] || []
  for (let j = 0; j < headerRow.length; j++) {
    const val = typeof headerRow[j] === 'number' ? headerRow[j] : parseInt(String(headerRow[j]))
    if (val === 1) { dateColStart = j; break }
  }

  // Find where day columns end
  let dateColEnd = headerRow.length
  for (let j = dateColStart; j < headerRow.length; j++) {
    const cell = String(headerRow[j] || '').toLowerCase()
    if (cell.includes('total') || cell.includes('grand')) { dateColEnd = j; break }
  }

  const daysCount = dateColEnd - dateColStart

  // Find summary columns (Total Hours, Rate, Gross, Net)
  let totalHoursCol = -1, rateCol = -1, grossCol = -1, netCol = -1
  for (let j = dateColEnd; j < headerRow.length; j++) {
    const cell = String(headerRow[j] || '').toLowerCase()
    if (cell.includes('total') && totalHoursCol === -1) totalHoursCol = j
    else if (cell.includes('rate') && rateCol === -1) rateCol = j
    else if ((cell.includes('gross') || cell.includes('total pay')) && grossCol === -1) grossCol = j
    else if (cell.includes('net') && netCol === -1) netCol = j
  }

  // Parse worker rows
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i] || []
    const rowNum = String(row[0] || '').trim()
    const name = String(row[nameCol] || '').trim()

    if (!name || name.toLowerCase().includes('total') || name.toLowerCase().includes('grand')) continue
    if (!rowNum && !name) continue

    const dailyHours = []
    const dailyNotes = []

    for (let j = dateColStart; j < dateColEnd; j++) {
      const cellVal = row[j]
      const cellStr = String(cellVal || '').trim().toUpperCase()

      if (cellStr in SPECIAL_VALUES) {
        dailyHours.push(SPECIAL_VALUES[cellStr].hours)
        dailyNotes.push(SPECIAL_VALUES[cellStr].note)
      } else if (cellVal === null || cellVal === undefined || cellVal === '') {
        dailyHours.push(0)
        dailyNotes.push(null)
      } else {
        const num = parseFloat(cellVal)
        dailyHours.push(isNaN(num) ? 0 : num)
        dailyNotes.push(null)
      }
    }

    // Pad to consistent length
    while (dailyHours.length < 31) { dailyHours.push(0); dailyNotes.push(null) }

    const trade = String(row[tradeCol] || '').trim()
    const totalHours = totalHoursCol >= 0 ? (parseFloat(row[totalHoursCol]) || 0) : dailyHours.reduce((s, h) => s + h, 0)
    const rate = rateCol >= 0 ? (parseFloat(row[rateCol]) || 0) : 0
    const grossTotal = grossCol >= 0 ? (parseFloat(row[grossCol]) || 0) : totalHours * rate
    const netSalary = netCol >= 0 ? (parseFloat(row[netCol]) || 0) : grossTotal

    result.workers.push({
      row_number: parseInt(rowNum) || result.workers.length + 1,
      worker_name: name,
      trade,
      daily_hours: dailyHours.slice(0, Math.max(daysCount, 28)),
      daily_notes: dailyNotes.slice(0, Math.max(daysCount, 28)),
      total_hours: totalHours,
      rate,
      gross_total: grossTotal,
      net_salary: netSalary,
      client_worker_id: null
    })
  }

  result.total_workers = result.workers.length
  result.total_hours = result.workers.reduce((s, w) => s + w.total_hours, 0)

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

export function matchWorkerToIWS(clientName, iwsWorkers) {
  if (!clientName) return null
  const clean = (s) => s.toLowerCase().trim().replace(/\s+/g, ' ')
  const client = clean(clientName)

  // 1. Exact match
  let match = iwsWorkers.find(w => clean(w.full_name) === client)
  if (match) return { worker: match, confidence: 'exact' }

  // 2. First name match
  const clientFirst = client.split(' ')[0]
  match = iwsWorkers.find(w => clean(w.full_name).startsWith(clientFirst))
  if (match) return { worker: match, confidence: 'first_name' }

  // 3. Last name match
  const clientLast = client.split(' ').pop()
  match = iwsWorkers.find(w => clean(w.full_name).endsWith(clientLast))
  if (match) return { worker: match, confidence: 'last_name' }

  // 4. Any word overlap
  const clientWords = client.split(' ').filter(w => w.length > 2)
  match = iwsWorkers.find(w => {
    const workerWords = clean(w.full_name).split(' ')
    return clientWords.some(cw => workerWords.includes(cw))
  })
  if (match) return { worker: match, confidence: 'partial' }

  return null
}
