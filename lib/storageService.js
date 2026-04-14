import { supabase } from './supabaseClient'

const DOC_BUCKET_MAP = {
  passport_copy: 'worker-documents',
  passport_photo: 'worker-photos',
  uae_visa: 'worker-documents',
  emirates_id: 'worker-documents',
  health_insurance: 'worker-documents',
  health_card: 'worker-documents',
  workmen_compensation: 'worker-documents',
  medical_fitness: 'worker-documents',
  labour_card: 'worker-documents',
  offer_letter: 'worker-documents',
  employment_contract: 'worker-documents',
  iloe_certificate: 'worker-documents',
  worker_policy_manual: 'letter-archive',
  passport_safekeeping: 'worker-documents',
}

function getBucket(docType) {
  return DOC_BUCKET_MAP[docType] || 'worker-documents'
}

function buildFilePath(worker, docType, file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const today = new Date()
  const dd = String(today.getDate()).padStart(2, '0')
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const yyyy = today.getFullYear()
  const name = (worker.full_name || '').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')
  const type = docType.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join('-')
  return `${worker.worker_number}/${worker.worker_number}_${name}_${type}_${dd}${mm}${yyyy}.${ext}`
}

// Round C path shape per CLAUDE.md §5.3.2:
//   {worker_number}/{doc_type}/{worker_name_safe}_{doc_type}_{ref_or_date}.{ext}
// where ref_or_date is the natural reference for the doc type (passport
// number, visa number, EID number, policy number) and falls back to DDMMYYYY
// when no reference is provided.
export function buildOnboardingPath(worker, docType, file, ref) {
  const ext = file.name.split('.').pop().toLowerCase()
  const today = new Date()
  const dd = String(today.getDate()).padStart(2, '0')
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const yyyy = today.getFullYear()
  const nameSafe = (worker.full_name || '')
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_]/g, '')
  const refSafe = (ref && String(ref).trim())
    ? String(ref).trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_\-]/g, '')
    : `${dd}${mm}${yyyy}`
  return `${worker.worker_number}/${docType}/${nameSafe}_${docType}_${refSafe}.${ext}`
}

export async function uploadWorkerDocument(worker, docType, file, ref) {
  const bucket = getBucket(docType)
  // When a ref is supplied (or for any onboarding-era caller), use the new
  // §5.3.2 path shape. Callers that don't supply ref keep today's behaviour.
  const path = (ref !== undefined)
    ? buildOnboardingPath(worker, docType, file, ref)
    : buildFilePath(worker, docType, file)

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600)

  if (signedError) throw new Error(`Could not get signed URL: ${signedError.message}`)

  return { path, bucket, signedUrl: signedData.signedUrl }
}

export async function getSignedUrl(storageRef, expiresIn = 3600) {
  if (!storageRef) return null

  // Multi-file (e.g. passport copy uploaded as images) — returns first.
  if (storageRef.startsWith('[')) {
    try {
      const arr = JSON.parse(storageRef)
      if (Array.isArray(arr) && arr.length) return getSignedUrl(arr[0], expiresIn)
    } catch { /* fall through */ }
  }

  if (storageRef.startsWith('blob:')) return null
  if (storageRef.startsWith('http') && !storageRef.includes('supabase')) return null

  if (storageRef.includes('::')) {
    const [bucket, path] = storageRef.split('::')
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)
    if (error) { console.error('getSignedUrl error:', error); return null }
    return data.signedUrl
  }

  return storageRef
}

// For multi-file storage refs (JSON-encoded arrays). Returns an array of
// signed URLs in the same order. Single-ref input returns a one-element array.
export async function getSignedUrls(storageRef, expiresIn = 3600) {
  if (!storageRef) return []
  let refs = [storageRef]
  if (storageRef.startsWith('[')) {
    try { const arr = JSON.parse(storageRef); if (Array.isArray(arr)) refs = arr } catch { /* keep as single */ }
  }
  const out = []
  for (const r of refs) {
    const url = await getSignedUrl(r, expiresIn)
    if (url) out.push(url)
  }
  return out
}

export async function uploadCertification(worker, certType, file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const today = new Date()
  const dd = String(today.getDate()).padStart(2, '0')
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const yyyy = today.getFullYear()
  const name = (worker.full_name || '').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')
  const type = certType.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')
  const path = `${worker.worker_number}/${worker.worker_number}_${name}_${type}_${dd}${mm}${yyyy}.${ext}`

  const { error } = await supabase.storage
    .from('worker-certifications')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data, error: signedError } = await supabase.storage
    .from('worker-certifications')
    .createSignedUrl(path, 3600)

  if (signedError) throw new Error(`Could not get signed URL: ${signedError.message}`)

  return {
    path: `worker-certifications::${path}`,
    signedUrl: data.signedUrl
  }
}
