'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { supabase } from '../../lib/supabaseClient'
import { formatCurrency, formatDate, getDocumentStatus, getStatusTone } from '../../lib/utils'

async function readTable(table) {
  try {
    const { data, error } = await supabase.from(table).select('*')
    if (error) {
      console.error(`reports ${table} error:`, error)
      return []
    }
    return data || []
  } catch (err) {
    console.error(`reports ${table} failed:`, err)
    return []
  }
}

function StatCard({ value, label }) {
  return (
    <div className="stat-card">
      <div className="num" style={{fontSize:22}}>{value}</div>
      <div className="lbl">{label}</div>
    </div>
  )
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || 'Unknown'
    acc[value] = (acc[value] || 0) + 1
    return acc
  }, {})
}

export default function ReportsPage() {
  const [rows, setRows] = useState({ workers:[], documents:[], suppliers:[], summaries:[], payroll:[], offboarding:[], warnings:[] })
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [workers, documents, suppliers, summaries, payroll, offboarding, warnings] = await Promise.all([
        readTable('workers'),
        readTable('documents'),
        readTable('suppliers'),
        readTable('supplier_timesheet_summaries'),
        readTable('payroll_batches'),
        readTable('offboarding'),
        readTable('warnings'),
      ])
      if (!cancelled) {
        setRows({ workers, documents, suppliers, summaries, payroll, offboarding, warnings })
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const stats = useMemo(() => {
    const activeWorkers = rows.workers.filter(w => String(w.status || '').toLowerCase() === 'active')
    const onboardingWorkers = rows.workers.filter(w => String(w.status || '').toLowerCase() === 'onboarding')
    const supplierWorkers = rows.workers.filter(w => w.supplier_id || String(w.category || '').toLowerCase().includes('subcontract'))
    const docStatuses = rows.documents.reduce((acc, doc) => {
      const status = getDocumentStatus(doc.expiry_date, doc.doc_type)
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})
    const supplierAmount = rows.summaries.reduce((sum, row) => sum + Number(row.total_amount || 0), 0)
    const payrollAmount = rows.payroll.reduce((sum, row) => sum + Number(row.total_net_pay || row.net_pay || row.total_amount || 0), 0)
    const openOffboarding = rows.offboarding.filter(row => !row.file_closed_at).length
    return { activeWorkers, onboardingWorkers, supplierWorkers, docStatuses, supplierAmount, payrollAmount, openOffboarding }
  }, [rows])

  const workerMatches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows.workers.slice(0, 12)
    return rows.workers.filter(worker => {
      const haystack = [
        worker.full_name,
        worker.worker_number,
        worker.trade,
        worker.role,
        worker.category,
        worker.passport_number,
        worker.emirates_id_number,
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    }).slice(0, 20)
  }, [query, rows.workers])

  const categoryCounts = countBy(rows.workers, 'category')
  const statusCounts = countBy(rows.workers, 'status')

  return (
    <AppShell pageTitle="Reports and stats">
      <PageHeader
        eyebrow="Reports"
        title="Reports and stats"
        description="Fast operational view across workers, suppliers, documents, payroll, and offboarding."
        actions={<Link className="btn btn-secondary" href="/records">Records library</Link>}
      />

      {loading ? <div className="empty-state"><p>Loading reports...</p></div> : (
        <>
          <div className="stat-grid">
            <StatCard value={stats.activeWorkers.length} label="Active workers" />
            <StatCard value={stats.onboardingWorkers.length} label="In onboarding" />
            <StatCard value={stats.supplierWorkers.length} label="Supplier workers" />
            <StatCard value={rows.suppliers.length} label="Supplier companies" />
            <StatCard value={(stats.docStatuses.expired || 0) + (stats.docStatuses.expiring_soon || 0)} label="Documents needing attention" />
            <StatCard value={stats.openOffboarding} label="Open offboarding files" />
            <StatCard value={formatCurrency(stats.supplierAmount)} label="Supplier summaries" />
            <StatCard value={formatCurrency(stats.payrollAmount)} label="Payroll batches" />
          </div>

          <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:12,marginBottom:12}}>
            <div className="panel">
              <div className="panel-header"><div><h2>Workers by category</h2></div></div>
              <div className="table-wrap"><table><tbody>{Object.entries(categoryCounts).map(([key, value]) => <tr key={key}><td>{key}</td><td style={{textAlign:'right',fontWeight:700}}>{value}</td></tr>)}</tbody></table></div>
            </div>
            <div className="panel">
              <div className="panel-header"><div><h2>Workers by status</h2></div></div>
              <div className="table-wrap"><table><tbody>{Object.entries(statusCounts).map(([key, value]) => <tr key={key}><td><StatusBadge label={key} tone={getStatusTone(key)} /></td><td style={{textAlign:'right',fontWeight:700}}>{value}</td></tr>)}</tbody></table></div>
            </div>
          </div>

          <div className="panel" style={{marginBottom:12}}>
            <div className="panel-header"><div><h2>Worker lookup</h2><p>Search by name, worker number, category, trade, passport, or Emirates ID.</p></div></div>
            <input className="form-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search any worker..." style={{marginBottom:10}} />
            <div className="table-wrap">
              <table>
                <thead><tr><th>Worker</th><th>Category</th><th>Status</th><th>Passport expiry</th><th>Emirates ID expiry</th><th></th></tr></thead>
                <tbody>{workerMatches.map(worker => (
                  <tr key={worker.id}>
                    <td><div style={{fontWeight:600}}>{worker.full_name}</div><div style={{fontSize:12,color:'var(--muted)'}}>{worker.worker_number}</div></td>
                    <td>{worker.category || '-'}</td>
                    <td><StatusBadge label={worker.status || 'unknown'} tone={getStatusTone(worker.status || '')} /></td>
                    <td>{formatDate(worker.passport_expiry)}</td>
                    <td>{formatDate(worker.emirates_id_expiry)}</td>
                    <td><Link className="btn btn-secondary btn-sm" href={`/workers/${worker.id}`}>Open</Link></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><div><h2>Document risk</h2><p>Expiry status from the document register.</p></div></div>
            <div className="stat-grid" style={{marginBottom:0}}>
              <StatCard value={stats.docStatuses.missing || 0} label="Missing" />
              <StatCard value={stats.docStatuses.expired || 0} label="Expired" />
              <StatCard value={stats.docStatuses.expiring_soon || 0} label="Expiring soon" />
              <StatCard value={stats.docStatuses.valid || 0} label="Valid" />
            </div>
          </div>
        </>
      )}
    </AppShell>
  )
}
