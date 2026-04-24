import { supabase } from './supabaseClient'

const PASSPORT_PHOTO_TYPE = 'passport_photo'

function parseStorageRef(storageRef) {
  if (!storageRef || typeof storageRef !== 'string') return null

  if (storageRef.startsWith('[')) {
    try {
      const refs = JSON.parse(storageRef)
      if (Array.isArray(refs) && refs.length) return parseStorageRef(refs[0])
    } catch {
      return null
    }
  }

  if (storageRef.includes('::')) {
    const [bucket, ...rest] = storageRef.split('::')
    const path = rest.join('::')
    if (!bucket || !path) return null
    return { bucket, path }
  }

  if (storageRef.startsWith('http') || storageRef.startsWith('blob:') || storageRef.startsWith('data:')) {
    return { url: storageRef }
  }

  return null
}

function getPhotoRef(row) {
  return row?.file_url || row?.front_file_url || row?.back_file_url || null
}

async function getPhotoRows(workerIds) {
  const ids = [...new Set((workerIds || []).filter(Boolean))]
  if (!ids.length) return []

  const { data, error } = await supabase
    .from('documents')
    .select('worker_id, file_url, front_file_url, back_file_url, status, updated_at')
    .eq('doc_type', PASSPORT_PHOTO_TYPE)
    .in('worker_id', ids)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data || []
}

async function createSignedPhotoUrl(storageRef, expiresIn = 3600) {
  const parsed = parseStorageRef(storageRef)
  if (!parsed) return null
  if (parsed.url) return parsed.url.startsWith('blob:') ? null : parsed.url

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, expiresIn)

  if (error) throw error
  return data?.signedUrl || null
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null)
    reader.onerror = () => reject(reader.error || new Error('Could not read worker photo blob'))
    reader.readAsDataURL(blob)
  })
}

async function createPhotoDataUrl(storageRef) {
  const parsed = parseStorageRef(storageRef)
  if (!parsed) return null

  if (parsed.url) {
    if (parsed.url.startsWith('data:')) return parsed.url
    if (parsed.url.startsWith('blob:')) {
      const blobResponse = await fetch(parsed.url)
      return blobToDataUrl(await blobResponse.blob())
    }
    const response = await fetch(parsed.url)
    if (!response.ok) throw new Error(`Could not fetch worker photo: ${response.status}`)
    return blobToDataUrl(await response.blob())
  }

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .download(parsed.path)

  if (error) throw error
  return blobToDataUrl(data)
}

export async function getWorkerPhotoUrl(workerId) {
  if (!workerId) return null

  const rows = await getPhotoRows([workerId])
  const row = rows.find(item => item.worker_id === workerId && item.status !== 'missing')
  if (!row) return null

  return createSignedPhotoUrl(getPhotoRef(row))
}

export async function getWorkerPhotoUrls(workerIds) {
  const ids = [...new Set((workerIds || []).filter(Boolean))]
  if (!ids.length) return {}

  const rows = await getPhotoRows(ids)
  const rowByWorkerId = new Map()

  for (const row of rows) {
    if (row.status === 'missing') continue
    if (!rowByWorkerId.has(row.worker_id) && getPhotoRef(row)) {
      rowByWorkerId.set(row.worker_id, row)
    }
  }

  const entries = await Promise.all(ids.map(async (workerId) => {
    const row = rowByWorkerId.get(workerId)
    if (!row) return [workerId, null]

    try {
      return [workerId, await createSignedPhotoUrl(getPhotoRef(row))]
    } catch (error) {
      console.error(`Failed to sign passport photo for worker ${workerId}:`, error)
      return [workerId, null]
    }
  }))

  return Object.fromEntries(entries)
}

export async function getWorkerPhotoDataUrl(workerId) {
  if (!workerId) return null

  const rows = await getPhotoRows([workerId])
  const row = rows.find(item => item.worker_id === workerId && item.status !== 'missing')
  if (!row) return null

  return createPhotoDataUrl(getPhotoRef(row))
}
