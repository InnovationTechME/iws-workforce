'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AppShell from '../../../components/AppShell'
import PageHeader from '../../../components/PageHeader'
import StatusBadge from '../../../components/StatusBadge'
import { getSupplierById, getSupplierRates, getSupplierWorkers, getSupplierSummaries } from '../../../lib/supplierService'
import { formatCurrency, formatDate, getStatusTone } from '../../../lib/utils'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtMonth(year, month) {
  const m = Number(month)
  return `${MONTH_NAMES[m - 1] || month} ${year}`
}

function StatCard({ value, label }) {
  return (
    <div className="stat-card">
      <div className="num" style={{fontSize:22}}>{value}</div>
      <div className="lbl">{label}</div>
    </div>
  )
}

export default function SupplierProfilePage() {
  const params = useParams()
  const supplierId = params?.id
  const [supplier, setSupplier] = useState(null)
  const [rates, setRates] = useState([])
  const [workers, setWorkers] = useState([])
  const [summaries, setSummaries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!supplierId) return
      setLoading(true)
      try {
        const [supplierRow, rateRows, workerRows, summaryRows] = await Promise.all([
          getSupplierById(supplierId),
          getSupplierRates(supplierId),
          getSupplierWorkers(supplierId),
          getSupplierSummaries(supplierId),
        ])
        if (cancelled) return
        setSupplier(supplierRow)
        setRates(rateRows || [])
        setWorkers(workerRows || [])
        setSummaries(summaryRows || [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [supplierId])

  const totals = useMemo(() => {
    return summaries.reduce((acc, row) => {
      acc.hours += Number(row.total_hours || 0)
      acc.amount += Number(row.total_amount || 0)
      acc.invoiced += Number(row.invoice_amount || 0)
      return acc
    }, { hours:0, amount:0, invoiced:0 })
  }, [summaries])

  if (loading) {
    return (
      <AppShell pageTitle="Supplier profile">
        <div className="empty-state"><p>Loading supplier profile...</p></div>
      </AppShell>
    )
  }

  if (!supplier) {
    return (
      <AppShell pageTitle="Supplier profile">
        <div className="empty-state">
          <h3>Supplier not found</h3>
          <p>This supplier may have been removed or the link is no longer valid.</p>
          <Link className="btn btn-primary" href="/suppliers">Back to suppliers</Link>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell pageTitle="Supplier profile">
      <PageHeader
        eyebrow="Supplier"
        title={supplier.name}
        description={supplier.trade_speciality || 'Supplier company profile, agreed rates, workers, and monthly billing history.'}
        meta={<StatusBadge label={supplier.active === false ? 'Inactive' : 'Active'} tone={supplier.active === false ? 'neutral' : 'success'} />}
        actions={
          <>
            <Link className="btn btn-secondary" href="/suppliers">Back</Link>
            <Link className="btn btn-secondary" href={`/workers?supplier=${supplier.id}`}>Workers</Link>
            <Link className="btn btn-secondary" href={`/timesheets/grid?supplier=${supplier.id}`}>Timesheets</Link>
            <Link className="btn btn-primary" href="/onboarding">Onboard worker</Link>
          </>
        }
      />

      <div className="stat-grid">
        <StatCard value={workers.length} label="Workers on this supplier" />
        <StatCard value={rates.length} label="Agreed trade rates" />
        <StatCard value={totals.hours.toLocaleString('en-AE')} label="Hours billed in summaries" />
        <StatCard value={formatCurrency(totals.invoiced || totals.amount)} label="Invoice/pay history" />
      </div>

      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:12,marginBottom:12}}>
        <div className="panel">
          <div className="panel-header"><div><h2>Company and PO</h2><p>Contract and billing reference details.</p></div></div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12,fontSize:13}}>
            <div><div className="form-label">PO number</div><div>{supplier.po_number || '-'}</div></div>
            <div><div className="form-label">PO value</div><div>{supplier.po_value ? formatCurrency(supplier.po_value) : '-'}</div></div>
            <div><div className="form-label">PO start</div><div>{formatDate(supplier.po_start_date)}</div></div>
            <div><div className="form-label">PO end</div><div>{formatDate(supplier.po_end_date)}</div></div>
            <div><div className="form-label">Payment terms</div><div>{supplier.payment_terms || '-'}</div></div>
            <div><div className="form-label">Trade speciality</div><div>{supplier.trade_speciality || '-'}</div></div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><div><h2>Contact</h2><p>Main supplier contact for workers and invoices.</p></div></div>
          <div style={{display:'grid',gap:10,fontSize:13}}>
            <div><div className="form-label">Contact person</div><div>{supplier.contact_person || '-'}</div></div>
            <div><div className="form-label">Email</div><div>{supplier.email || supplier.contact_email || '-'}</div></div>
            <div><div className="form-label">Phone</div><div>{supplier.phone || supplier.contact_phone || '-'}</div></div>
            {supplier.notes && <div><div className="form-label">Notes</div><div>{supplier.notes}</div></div>}
          </div>
        </div>
      </div>

      <div className="panel" style={{marginBottom:12}}>
        <div className="panel-header"><div><h2>Agreed trade rates</h2><p>Use these rates when onboarding workers from this supplier.</p></div></div>
        {rates.length === 0 ? (
          <div className="empty-state"><h3>No agreed rates</h3><p>Add supplier rates on the supplier register before onboarding workers.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Trade / role</th><th>AED / hr</th><th>Effective from</th><th>Effective to</th><th>Notes</th></tr></thead>
              <tbody>{rates.map(rate => (
                <tr key={rate.id}>
                  <td style={{fontWeight:600}}>{rate.trade_role}</td>
                  <td>{formatCurrency(rate.hourly_rate)}</td>
                  <td>{formatDate(rate.effective_from)}</td>
                  <td>{formatDate(rate.effective_to)}</td>
                  <td style={{color:'var(--muted)'}}>{rate.notes || '-'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel" style={{marginBottom:12}}>
        <div className="panel-header">
          <div><h2>Workers</h2><p>Supplier workers currently linked to this company.</p></div>
          <Link className="btn btn-secondary btn-sm" href={`/workers?supplier=${supplier.id}`}>Open filtered list</Link>
        </div>
        {workers.length === 0 ? (
          <div className="empty-state"><h3>No workers linked</h3><p>Use Onboarding to create workers against this supplier company.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Worker</th><th>Role</th><th>Rate</th><th>Status</th><th></th></tr></thead>
              <tbody>{workers.map(worker => (
                <tr key={worker.id}>
                  <td><div style={{fontWeight:600}}>{worker.full_name}</div><div style={{fontSize:12,color:'var(--muted)'}}>{worker.worker_number}</div></td>
                  <td>{worker.trade || worker.role || '-'}</td>
                  <td>{worker.hourly_rate ? `${formatCurrency(worker.hourly_rate)}/hr` : '-'}</td>
                  <td><StatusBadge label={worker.status || 'active'} tone={getStatusTone(worker.status || 'active')} /></td>
                  <td><Link className="btn btn-secondary btn-sm" href={`/workers/${worker.id}`}>Open</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div><h2>Timesheet and pay history</h2><p>Monthly supplier summaries, invoice status, and PO tracking.</p></div>
          <Link className="btn btn-secondary btn-sm" href={`/timesheets/grid?supplier=${supplier.id}`}>Open timesheets</Link>
        </div>
        {summaries.length === 0 ? (
          <div className="empty-state"><h3>No monthly summaries</h3><p>Supplier monthly summaries will appear after timesheet reconciliation.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Month</th><th>Workers</th><th>Hours</th><th>Amount</th><th>Invoice</th><th>Status</th></tr></thead>
              <tbody>{summaries.map(row => (
                <tr key={row.id}>
                  <td>{fmtMonth(row.year, row.month)}</td>
                  <td>{row.worker_count ?? '-'}</td>
                  <td>{row.total_hours ?? '-'}</td>
                  <td>{row.total_amount != null ? formatCurrency(row.total_amount) : '-'}</td>
                  <td>{row.invoice_number || '-'}{row.invoice_amount ? <div style={{fontSize:12,color:'var(--muted)'}}>{formatCurrency(row.invoice_amount)}</div> : null}</td>
                  <td><StatusBadge label={row.status || 'draft'} tone={getStatusTone(row.status || 'draft')} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}
