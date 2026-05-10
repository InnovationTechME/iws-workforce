'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getAllDocumentsWithWorkers } from '../../lib/documentService'
import { getOffers } from '../../lib/offerService'
import { getAllWarnings } from '../../lib/warningService'
import { getAllLetters } from '../../lib/letterService'
import { getPayrollBatches } from '../../lib/payrollService'
import { getAllSupplierSummaries } from '../../lib/supplierService'
import { DOCUMENT_TYPE_OPTIONS, getDocumentTypeOption, isDocumentExpiryRequired, normalizeDocumentType } from '../../lib/documentTypes'
import { STARTERS } from '../../lib/whatsappTemplates'
import { formatCurrency, formatDate, getDocumentStatus, getStatusTone } from '../../lib/utils'

const RECORD_FILTERS = [
  { value: 'all', label: 'All records' },
  { value: 'template', label: 'Policies & templates' },
  { value: 'document', label: 'Worker documents' },
  { value: 'letter', label: 'Letters & warnings' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'supplier', label: 'Suppliers' },
]

const SCOPE_FILTERS = [
  { value: 'all', label: 'All scopes' },
  { value: 'worker', label: 'Worker-linked' },
  { value: 'template', label: 'Policies/templates' },
  { value: 'supplier', label: 'Supplier/company' },
  { value: 'payroll', label: 'Payroll/monthly' },
]

const STATIC_LIBRARY = [
  {
      kind: 'template',
      scope: 'template',
    category: 'Policy',
    title: 'Worker policy manual',
    subject: 'Internal policy',
    owner: 'HR',
    status: 'template',
    date: '',
    route: '/packs',
    detail: 'Issued through document packs. Template changes should be versioned.',
  },
  {
    kind: 'template',
    category: 'Policy',
    title: 'Passport safekeeping acknowledgement',
    subject: 'Worker acknowledgement',
    owner: 'HR',
    status: 'template',
    date: '',
    route: '/packs',
    detail: 'Generated per worker and stored as a worker record.',
  },
  {
    kind: 'template',
    category: 'Memo',
    title: 'PPE and site safety memo',
    subject: 'Operational memo',
    owner: 'Operations',
    status: 'template',
    date: '',
    route: '/inbox',
    detail: 'Reusable staff communication template.',
  },
  {
    kind: 'template',
    category: 'Letter',
    title: 'Offer letter',
    subject: 'Direct staff offer',
    owner: 'HR',
    status: 'live',
    date: 'Valid 7 days',
    route: '/offers',
    detail: 'Offer validity is a 7-day offer window, not a compliance expiry date.',
  },
  {
    kind: 'template',
    category: 'Letter',
    title: 'Warning letter',
    subject: 'Disciplinary record',
    owner: 'HR',
    status: 'live',
    date: '',
    route: '/warnings',
    detail: 'Generated warning records should remain auditable.',
  },
  {
    kind: 'template',
    category: 'Exit',
    title: 'Termination and resignation notices',
    subject: 'Offboarding',
    owner: 'HR',
    status: 'planned',
    date: '',
    route: '/offboarding-exit',
    detail: 'Part of the fuller offboarding workflow.',
  },
  {
    kind: 'template',
    category: 'Exit',
    title: 'Full and final settlement',
    subject: 'EOS / accounts',
    owner: 'Accounts',
    status: 'later pr',
    date: '',
    route: '/offboarding-exit',
    detail: 'Keep final settlement in its own guarded workstream.',
  },
]

const GOVERNANCE_RULES = [
  { title: 'Worker numbers', detail: 'IWS worker numbers are permanent internal IDs. Do not reuse after exit.' },
  { title: 'Generated records', detail: 'Issued offers, warnings, letters, payroll, and packs should be retained as immutable records.' },
  { title: 'Templates', detail: 'Policies and master templates should be changed by controlled system updates, then newly issued records use the new version.' },
  { title: 'Corrections', detail: 'Correct a live mistake by creating a replacement or revision record, not silently editing the issued record.' },
]

function withTimeout(promise, label, timeoutMs = 8000) {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}

function statusTone(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'template' || s === 'later pr' || s === 'planned') return s === 'later pr' ? 'warning' : 'neutral'
  return getStatusTone(s)
}

function documentStatus(doc) {
  const type = normalizeDocumentType(doc.doc_type)
  if (!doc.file_url) return 'missing'
  if (!isDocumentExpiryRequired(type)) return 'valid'
  return getDocumentStatus(doc.expiry_date, type)
}

function workerName(worker) {
  return [worker?.full_name, worker?.worker_number].filter(Boolean).join(' - ') || 'Unassigned worker'
}

function normaliseLiveRecords(data) {
  const documentRows = (data.documents || []).map(doc => {
    const docType = normalizeDocumentType(doc.doc_type)
    const option = getDocumentTypeOption(docType)
    const status = documentStatus(doc)
    return {
      id: `doc-${doc.id}`,
      kind: 'document',
      scope: 'worker',
      doc_type: docType,
      worker_id: doc.worker_id,
      category: 'Worker document',
      title: option.label,
      subject: workerName(doc.workers),
      owner: 'HR',
      status,
      date: doc.expiry_date ? `Expiry ${formatDate(doc.expiry_date)}` : 'No expiry',
      route: '/documents',
      detail: doc.file_url ? 'File on record' : 'Missing file',
      priority: ['missing', 'expired', 'expiring_soon'].includes(status) ? 0 : 2,
    }
  })

  const offerRows = (data.offers || []).map(row => ({
    id: `offer-${row.id}`,
    kind: 'letter',
    scope: 'worker',
    category: 'Offer',
    title: row.ref_number || 'Offer letter',
    subject: row.full_name || 'Candidate',
    owner: 'HR',
    status: row.status || 'draft',
    date: row.valid_until ? `Valid until ${formatDate(row.valid_until)}` : 'Valid 7 days',
    route: '/offers',
    detail: row.trade_role || row.category || 'Offer record',
    priority: String(row.status || '').toLowerCase() === 'draft' ? 1 : 2,
  }))

  const warningRows = (data.warnings || []).map(row => ({
    id: `warning-${row.id}`,
    kind: 'letter',
    scope: 'worker',
    category: 'Warning',
    title: row.ref_number || row.level || 'Warning record',
    subject: [row.worker_name, row.worker_number].filter(Boolean).join(' - ') || 'Worker',
    owner: 'HR',
    status: row.status || 'open',
    date: formatDate(row.issue_date || row.issued_date),
    route: '/warnings',
    detail: row.reason || row.description || 'Disciplinary record',
    priority: String(row.status || '').toLowerCase() === 'open' ? 1 : 2,
  }))

  const letterRows = (data.letters || []).map(row => ({
    id: `letter-${row.id}`,
    kind: 'letter',
    scope: 'worker',
    category: 'Letter',
    title: row.ref_number || row.letter_type || 'Letter',
    subject: [row.worker_name, row.worker_number].filter(Boolean).join(' - ') || 'Worker',
    owner: row.issued_by || 'HR',
    status: row.status || 'issued',
    date: formatDate(row.issued_date || row.generated_at),
    route: row.worker_id ? `/workers/${row.worker_id}` : '/workers',
    detail: String(row.letter_type || 'Letter').replace(/_/g, ' '),
    priority: 2,
  }))

  const payrollRows = (data.payroll || []).map(row => ({
    id: `payroll-${row.id}`,
    kind: 'payroll',
    scope: 'payroll',
    category: 'Payroll',
    title: row.month_label || `${row.month || ''}/${row.year || ''}`,
    subject: 'Payroll batch',
    owner: 'Accounts',
    status: row.status || 'draft',
    date: row.locked_at ? `Locked ${formatDate(row.locked_at)}` : formatDate(row.created_at),
    route: '/payroll',
    detail: formatCurrency(row.total_net_pay || row.net_pay || row.total_amount || 0),
    priority: String(row.status || '').toLowerCase() === 'locked' ? 2 : 1,
  }))

  const supplierRows = (data.summaries || []).map(row => ({
    id: `supplier-summary-${row.id}`,
    kind: 'supplier',
    scope: 'supplier',
    category: 'Supplier summary',
    title: row.month_label || `${row.month || ''}/${row.year || ''}`,
    subject: row.supplier?.name || 'Supplier',
    owner: 'Operations',
    status: row.status || 'draft',
    date: formatDate(row.updated_at || row.created_at),
    route: row.supplier_id ? `/suppliers/${row.supplier_id}` : '/suppliers',
    detail: `${Number(row.total_hours || 0).toLocaleString('en-AE')} hrs - ${formatCurrency(row.total_amount || 0)}`,
    priority: String(row.status || '').toLowerCase() === 'paid' ? 2 : 1,
  }))

  return [...documentRows, ...offerRows, ...warningRows, ...letterRows, ...payrollRows, ...supplierRows]
}

function StatCard({ value, label }) {
  return (
    <div className="stat-card">
      <div className="num" style={{fontSize:22}}>{value}</div>
      <div className="lbl">{label}</div>
    </div>
  )
}

export default function RecordsPage() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [scopeFilter, setScopeFilter] = useState('all')
  const [docTypeFilter, setDocTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [data, setData] = useState({ documents:[], offers:[], warnings:[], letters:[], payroll:[], summaries:[] })
  const [loading, setLoading] = useState(true)
  const [loadErrors, setLoadErrors] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const loaders = [
        ['documents', getAllDocumentsWithWorkers],
        ['offers', getOffers],
        ['warnings', getAllWarnings],
        ['letters', getAllLetters],
        ['payroll', getPayrollBatches],
        ['summaries', getAllSupplierSummaries],
      ]
      const settled = await Promise.allSettled(loaders.map(([key, loader]) => withTimeout(loader(), key)))
      if (cancelled) return
      const next = { documents:[], offers:[], warnings:[], letters:[], payroll:[], summaries:[] }
      const errors = []
      settled.forEach((result, index) => {
        const key = loaders[index][0]
        if (result.status === 'fulfilled') next[key] = result.value || []
        else errors.push(`${key}: ${result.reason?.message || 'load failed'}`)
      })
      setData(next)
      setLoadErrors(errors)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const whatsappTemplates = useMemo(() => Object.entries(STARTERS || {}).map(([key, value]) => ({
    id: `whatsapp-${key}`,
    kind: 'template',
    scope: 'template',
    category: 'WhatsApp',
    title: value.label || key,
    subject: 'Staff message',
    owner: value.owner || 'HR',
    status: 'template',
    date: '',
    route: '/inbox',
    detail: value.description || 'Reusable message template.',
    priority: 2,
  })), [])

  const allRecords = useMemo(() => {
    const staticRows = STATIC_LIBRARY.map(row => ({ scope: 'template', ...row, priority: -1 }))
    return [...staticRows, ...whatsappTemplates, ...normaliseLiveRecords(data)]
  }, [data, whatsappTemplates])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allRecords
      .filter(row => filter === 'all' || row.kind === filter)
      .filter(row => scopeFilter === 'all' || row.scope === scopeFilter)
      .filter(row => docTypeFilter === 'all' || row.doc_type === docTypeFilter)
      .filter(row => statusFilter === 'all' || String(row.status || '').toLowerCase() === statusFilter)
      .filter(row => {
        if (!q) return true
        const haystack = [row.category, row.title, row.subject, row.owner, row.status, row.date, row.detail].join(' ').toLowerCase()
        return haystack.includes(q)
      })
      .sort((a, b) => (a.priority ?? 2) - (b.priority ?? 2))
      .slice(0, 120)
  }, [allRecords, docTypeFilter, filter, query, scopeFilter, statusFilter])

  const statusOptions = useMemo(() => {
    const statuses = new Set(allRecords.map(row => String(row.status || '').toLowerCase()).filter(Boolean))
    return ['all', ...Array.from(statuses).sort()]
  }, [allRecords])

  const stats = useMemo(() => {
    const live = normaliseLiveRecords(data)
    const docAttention = live.filter(row => row.kind === 'document' && ['missing', 'expired', 'expiring_soon'].includes(String(row.status).toLowerCase())).length
    const openLetters = live.filter(row => row.kind === 'letter' && ['draft', 'open', 'active'].includes(String(row.status).toLowerCase())).length
    const openPayroll = live.filter(row => row.kind === 'payroll' && String(row.status).toLowerCase() !== 'locked').length
    const openSuppliers = live.filter(row => row.kind === 'supplier' && !['paid', 'closed'].includes(String(row.status).toLowerCase())).length
    return { docAttention, openLetters, openPayroll, openSuppliers, total: live.length }
  }, [data])

  const workerLinkedCount = useMemo(() => allRecords.filter(row => row.scope === 'worker').length, [allRecords])

  return (
    <AppShell pageTitle="Records and templates">
      <PageHeader
        eyebrow="Records"
        title="Records center"
        description="Search policies, templates, worker documents, letters, payroll records, and supplier summaries from one place."
        actions={
          <>
            <Link className="btn btn-secondary" href="/reports">Reports & stats</Link>
            <Link className="btn btn-primary" href="/documents">Document register</Link>
          </>
        }
      />

      <div className="stat-grid">
        <StatCard value={stats.docAttention} label="Document issues" />
        <StatCard value={stats.openLetters} label="Open letters/offers" />
        <StatCard value={stats.openPayroll} label="Payroll needing action" />
        <StatCard value={stats.openSuppliers} label="Supplier summaries open" />
        <StatCard value={stats.total} label="Live indexed records" />
        <StatCard value={workerLinkedCount} label="Worker-linked records" />
      </div>

      <div className="panel" style={{marginBottom:12}}>
        <div className="panel-header">
          <div>
            <h2>Search records</h2>
            <p>Use this page as the index. Source pages keep the editable workflow and audit trail.</p>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'minmax(220px,1fr) 190px 190px 210px 170px',gap:10}}>
          <input className="form-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search worker, PO, offer, warning, document, payroll..." />
          <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)}>
            {RECORD_FILTERS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select className="form-select" value={scopeFilter} onChange={e => setScopeFilter(e.target.value)}>
            {SCOPE_FILTERS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select className="form-select" value={docTypeFilter} onChange={e => setDocTypeFilter(e.target.value)}>
            <option value="all">All document types</option>
            {DOCUMENT_TYPE_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {statusOptions.map(status => <option key={status} value={status}>{status === 'all' ? 'All statuses' : status.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        {loadErrors.length > 0 && (
          <div className="alert warning" style={{marginTop:10}}>
            Some record sources did not load: {loadErrors.join('; ')}
          </div>
        )}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 360px',gap:12,alignItems:'start'}}>
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Record index</h2>
              <p>{loading ? `Refreshing live records - ${filtered.length} records available` : `${filtered.length} matching records shown`}</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Record</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="6">No records match this filter.</td></tr>
                ) : filtered.map(row => (
                  <tr key={row.id || `${row.kind}-${row.title}-${row.subject}`}>
                    <td>{row.category}</td>
                    <td>
                      <div style={{fontWeight:700}}>{row.title}</div>
                      <div style={{fontSize:12,color:'var(--muted)'}}>{row.subject}</div>
                      <div style={{fontSize:12,color:'var(--muted)'}}>{row.detail}</div>
                    </td>
                    <td>{row.owner}</td>
                    <td><StatusBadge label={String(row.status || 'record').replace(/_/g, ' ')} tone={statusTone(row.status)} /></td>
                    <td>{row.date || '-'}</td>
                    <td><Link className="btn btn-secondary btn-sm" href={row.route}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{display:'grid',gap:12}}>
          <div className="panel">
            <div className="panel-header"><div><h2>Record controls</h2></div></div>
            <div style={{display:'grid',gap:8}}>
              {GOVERNANCE_RULES.map(rule => (
                <div key={rule.title} style={{border:'1px solid var(--border)',borderRadius:8,padding:10}}>
                  <div style={{fontWeight:700,marginBottom:4}}>{rule.title}</div>
                  <div style={{fontSize:13,color:'var(--muted)',lineHeight:1.45}}>{rule.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><div><h2>Document metadata</h2><p>Expiry is collected only where the document has a real renewal date.</p></div></div>
            <div className="table-wrap">
              <table>
                <tbody>
                  {DOCUMENT_TYPE_OPTIONS.map(doc => (
                    <tr key={doc.value}>
                      <td>{doc.label}</td>
                      <td style={{textAlign:'right'}}>
                        <StatusBadge label={doc.expiryRequired ? 'expiry tracked' : 'no expiry'} tone={doc.expiryRequired ? 'warning' : 'neutral'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><div><h2>Fast routes</h2></div></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <Link className="btn btn-secondary" href="/workers">Workers</Link>
              <Link className="btn btn-secondary" href="/suppliers">Suppliers</Link>
              <Link className="btn btn-secondary" href="/offers">Offers</Link>
              <Link className="btn btn-secondary" href="/warnings">Warnings</Link>
              <Link className="btn btn-secondary" href="/payroll">Payroll</Link>
              <Link className="btn btn-secondary" href="/timesheet-reconcile">Conflicts</Link>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><div><h2>Clean start</h2><p>Reset is a controlled admin script, not an in-app button.</p></div></div>
            <div style={{fontSize:13,color:'var(--muted)',lineHeight:1.5}}>
              Use <code>npm run data:audit</code> before any cleanup. For a true empty operational system, back up Supabase, then run the guarded reset script locally with the confirmation flag.
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
