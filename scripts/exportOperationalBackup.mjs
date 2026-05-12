// Exports live operational Supabase data to local JSON files.
// Default is database metadata only. Add --storage-files to also download
// files from known Storage buckets into the backup folder.
//
// Run:
//   node scripts/exportOperationalBackup.mjs
//   node scripts/exportOperationalBackup.mjs --storage-files

import { mkdir, writeFile } from 'node:fs/promises'
import { createWriteStream, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const includeStorageFiles = process.argv.includes('--storage-files')

const TABLES = [
  'workers',
  'suppliers',
  'supplier_rates',
  'documents',
  'certifications',
  'warnings',
  'letters',
  'tasks',
  'timesheet_headers',
  'timesheet_lines',
  'timesheet_discrepancies',
  'supplier_timesheet_summaries',
  'payroll_batches',
  'payroll_lines',
  'offboarding',
  'onboarding',
  'offers',
  'clients',
  'attendance',
  'leave_records',
  'public_holidays',
  'work_experience',
]

const STORAGE_BUCKETS = [
  'worker-documents',
  'worker-certifications',
  'worker-photos',
  'letter-archive',
  'payslips',
  'timesheet-uploads',
]

function loadEnv() {
  const text = readFileSync(resolve(projectRoot, '.env.local'), 'utf8')
  const env = {}
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
  return env
}

function stampForPath(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '').replace('T', '-').replace('Z', 'Z')
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function exportTable(supabase, table, outputDir) {
  const { data, error, count } = await supabase
    .from(table)
    .select('*', { count: 'exact' })

  if (error) {
    return {
      table,
      ok: false,
      row_count: 0,
      error: error.message,
    }
  }

  await writeJson(join(outputDir, 'tables', `${table}.json`), data || [])
  return {
    table,
    ok: true,
    row_count: count ?? data?.length ?? 0,
    error: null,
  }
}

async function listBucketRecursive(supabase, bucket, prefix = '') {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })

  if (error) throw error

  const files = []
  for (const item of data || []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name
    const isFolder = !item.id && !item.metadata
    if (isFolder) {
      files.push(...await listBucketRecursive(supabase, bucket, path))
      continue
    }
    files.push({ ...item, path })
  }
  return files
}

async function downloadStorageFile(supabase, bucket, filePath, outputDir) {
  const { data, error } = await supabase.storage.from(bucket).download(filePath)
  if (error) throw error

  const targetPath = join(outputDir, 'storage', bucket, filePath)
  await mkdir(dirname(targetPath), { recursive: true })

  if (data.stream) {
    await pipeline(Readable.fromWeb(data.stream()), createWriteStream(targetPath))
    return
  }

  const buffer = Buffer.from(await data.arrayBuffer())
  await writeFile(targetPath, buffer)
}

async function exportStorage(supabase, outputDir) {
  const results = []
  await mkdir(join(outputDir, 'storage-metadata'), { recursive: true })

  for (const bucket of STORAGE_BUCKETS) {
    try {
      const files = await listBucketRecursive(supabase, bucket)
      await writeJson(join(outputDir, 'storage-metadata', `${bucket}.json`), files)

      let downloaded = 0
      if (includeStorageFiles) {
        for (const file of files) {
          await downloadStorageFile(supabase, bucket, file.path, outputDir)
          downloaded += 1
        }
      }

      results.push({
        bucket,
        ok: true,
        file_count: files.length,
        files_downloaded: downloaded,
        error: null,
      })
    } catch (error) {
      results.push({
        bucket,
        ok: false,
        file_count: 0,
        files_downloaded: 0,
        error: error.message,
      })
    }
  }

  return results
}

const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
const outputDir = resolve(projectRoot, 'backups', `iws-backup-${stampForPath()}`)

await mkdir(join(outputDir, 'tables'), { recursive: true })

const manifest = {
  created_at: new Date().toISOString(),
  project_url: url,
  project_ref: url.split('//')[1]?.split('.')[0] || null,
  backup_type: includeStorageFiles ? 'database-json-and-storage-files' : 'database-json-and-storage-metadata',
  storage_files_downloaded: includeStorageFiles,
  notes: [
    'This export is a safety snapshot before operational cleanup or repair work.',
    'It does not replace Supabase platform backups or point-in-time recovery.',
    includeStorageFiles
      ? 'Storage files were downloaded into the storage folder.'
      : 'Storage object metadata was exported only. Re-run with --storage-files for local copies of uploaded files.',
  ],
  tables: [],
  storage: [],
}

for (const table of TABLES) {
  const result = await exportTable(supabase, table, outputDir)
  manifest.tables.push(result)
  console.log(`${result.ok ? 'OK' : 'SKIP'} table ${table}: ${result.row_count}${result.error ? ` (${result.error})` : ''}`)
}

manifest.storage = await exportStorage(supabase, outputDir)
for (const result of manifest.storage) {
  console.log(`${result.ok ? 'OK' : 'SKIP'} bucket ${result.bucket}: ${result.file_count} files, ${result.files_downloaded} downloaded${result.error ? ` (${result.error})` : ''}`)
}

await writeJson(join(outputDir, 'manifest.json'), manifest)

console.log('')
console.log(`Backup export complete: ${outputDir}`)
