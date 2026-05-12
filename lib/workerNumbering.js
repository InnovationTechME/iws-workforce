const DEFAULT_PREFIX = 'IWS'
const DEFAULT_PAD_WIDTH = 4

function envValue(name, fallback) {
  if (typeof process === 'undefined') return fallback
  return process.env[name] || fallback
}

export function getWorkerNumberConfig() {
  const prefix = envValue('NEXT_PUBLIC_WORKER_NUMBER_PREFIX', DEFAULT_PREFIX).trim() || DEFAULT_PREFIX
  const includeYear = envValue('NEXT_PUBLIC_WORKER_NUMBER_INCLUDE_YEAR', 'true') !== 'false'
  const padWidth = Number(envValue('NEXT_PUBLIC_WORKER_NUMBER_PAD_WIDTH', String(DEFAULT_PAD_WIDTH))) || DEFAULT_PAD_WIDTH
  const separator = envValue('NEXT_PUBLIC_WORKER_NUMBER_SEPARATOR', '-')
  return { prefix, includeYear, padWidth, separator }
}

export function workerNumberPattern(date = new Date()) {
  const { prefix, includeYear, separator } = getWorkerNumberConfig()
  const year = date.getFullYear()
  return includeYear ? `${prefix}${separator}${year}${separator}%` : `${prefix}${separator}%`
}

export function extractWorkerSequence(workerNumber) {
  const match = String(workerNumber || '').match(/(\d+)\s*$/)
  return match ? Number(match[1]) : 0
}

export function formatWorkerNumber(sequence, date = new Date()) {
  const { prefix, includeYear, padWidth, separator } = getWorkerNumberConfig()
  const year = date.getFullYear()
  const padded = String(sequence).padStart(padWidth, '0')
  return includeYear ? `${prefix}${separator}${year}${separator}${padded}` : `${prefix}${separator}${padded}`
}

export function nextWorkerNumberFromRows(rows, date = new Date()) {
  const maxSequence = (rows || []).reduce((max, row) => Math.max(max, extractWorkerSequence(row.worker_number)), 0)
  return formatWorkerNumber(maxSequence + 1, date)
}
