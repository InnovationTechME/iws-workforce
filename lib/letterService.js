import { supabase } from './supabaseClient'

const PREFIX_BY_TYPE = {
  offer_letter: 'OL',
  warning_1st: 'W1',
  warning_2nd: 'W2',
  warning_final: 'WF',
  experience_letter: 'EXP',
  memo: 'MEMO',
  termination_notice: 'TERM',
  termination_no_notice: 'TERM44',
  resignation_acceptance: 'RES',
  policy_manual: 'POL',
}

export function generateRefNumber(letterType = 'letter') {
  const prefix = PREFIX_BY_TYPE[letterType] || 'LTR'
  const now = new Date()
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('')
  return `IT-${prefix}-${stamp}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
}

function mapLetter(row) {
  const metadata = row.metadata || {}
  return {
    ...row,
    letter_type: metadata.letter_type || row.letter_type,
    worker_name: metadata.worker_name || '',
    worker_number: metadata.worker_number || '',
    language: metadata.language || 'english',
    issued_date: metadata.issued_date || row.generated_at?.slice(0, 10) || '',
    issued_by: row.generated_by || metadata.issued_by || '',
    linked_record_id: metadata.linked_record_id || null,
    status: metadata.status || 'issued',
    notes: metadata.notes || '',
  }
}

function dbLetterType(letterType) {
  if (['warning_1st', 'warning_2nd', 'warning_final'].includes(letterType)) return 'warning_letter'
  if (['termination_notice', 'termination_no_notice', 'resignation_acceptance'].includes(letterType)) return 'memo'
  return letterType
}

export async function getLettersByWorker(workerId) {
  const { data, error } = await supabase
    .from('letters')
    .select('*')
    .eq('worker_id', workerId)
    .order('generated_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapLetter)
}

export async function addLetter(letter) {
  const generatedAt = letter.issued_date
    ? `${letter.issued_date}T00:00:00.000Z`
    : new Date().toISOString()

  const payload = {
    ref_number: letter.ref_number || generateRefNumber(letter.letter_type),
    worker_id: letter.worker_id,
    letter_type: dbLetterType(letter.letter_type),
    generated_at: generatedAt,
    generated_by: letter.issued_by || letter.generated_by || null,
    file_url: letter.file_url || null,
    metadata: {
      worker_name: letter.worker_name || null,
      worker_number: letter.worker_number || null,
      letter_type: letter.letter_type,
      language: letter.language || 'english',
      issued_date: letter.issued_date || generatedAt.slice(0, 10),
      issued_by: letter.issued_by || null,
      linked_record_id: letter.linked_record_id || null,
      status: letter.status || 'issued',
      notes: letter.notes || null,
    },
  }

  const { data, error } = await supabase
    .from('letters')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return mapLetter(data)
}
