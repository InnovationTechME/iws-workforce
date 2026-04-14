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

export async function uploadWorkerDocument(worker, docType, file) {
  const bucket = getBucket(docType)
  const path = buildFilePath(worker, docType, file)

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
