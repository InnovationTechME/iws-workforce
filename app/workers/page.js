'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import WorkerAvatar from '../../components/WorkerAvatar'
import { getWorkers } from '../../lib/workerService'
import { getWorkerPhotoUrls } from '../../lib/workerPhotoService'
import { formatCurrency, getStatusTone } from '../../lib/utils'

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'pre-employment', label: 'Pre-employment' },
  { value: 'inactive', label: 'Inactive' },
]

const isActiveWorker = (worker) => String(worker.status || '').toLowerCase() === 'active'
const isInactiveWorker = (worker) => String(worker.status || '').toLowerCase() === 'inactive' || worker.active === false
const isMonthlyCategory = (worker) => ['Permanent Staff', 'Office Staff'].includes(worker.category)

export default function WorkersPageWrapper() {
  return <Suspense fallback={null}><WorkersPage /></Suspense>
}

function WorkersPage() {
  const searchParams = useSearchParams()
  const [workers, setWorkers] = useState([])
  const [workerPhotoUrls, setWorkerPhotoUrls] = useState({})
  const [photoLookupReady, setPhotoLookupReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const router = useRouter()
  const supplierFilter = searchParams.get('supplier') || 'all'

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        const data = await getWorkers()
        if (cancelled) return
        setWorkers(data || [])

        try {
          const photoUrls = await getWorkerPhotoUrls((data || []).map(worker => worker.id))
          if (!cancelled) {
            setWorkerPhotoUrls(photoUrls)
            setPhotoLookupReady(true)
          }
        } catch (photoError) {
          console.error('Failed to batch load worker photos:', photoError)
          if (!cancelled) {
            setWorkerPhotoUrls({})
            setPhotoLookupReady(false)
          }
        }
      } catch (err) {
        console.error('Failed to load workers:', err)
        if (!cancelled) {
          setWorkers([])
          setWorkerPhotoUrls({})
          setPhotoLookupReady(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = workers.filter(w => {
    const q = search.toLowerCase()
    const matchSearch = !search || (w.full_name || '').toLowerCase().includes(q) || w.worker_number?.toLowerCase().includes(q) || w.trade_role?.toLowerCase().includes(q)
    const matchCat = categoryFilter === 'all' || w.category === categoryFilter
    const matchStatus = statusFilter === 'all' || String(w.status || '').toLowerCase() === statusFilter
    const matchSupplier = supplierFilter === 'all' || w.supplier_id === supplierFilter
    return matchSearch && matchCat && matchStatus && matchSupplier
  })

  const categories = ['Permanent Staff', 'Contract Worker', 'Subcontract Worker', 'Office Staff']

  // §5.3.5 — no worker can be created without an onboarding row. The Workers
  // register Add button re-routes to the onboarding track selector; direct
  // staff from there bounce to the Offers flow.
  const handleAddClick = () => router.push('/onboarding?add=1')

  return (
    <AppShell pageTitle="Workers">
      <PageHeader eyebrow="Workers" title="Worker register" description="All workers — direct employees, contracted hourly, subcontractors, and office staff."
        actions={<button className="btn btn-primary" onClick={handleAddClick}>+ Add Worker</button>} />

      {supplierFilter !== 'all' && (
        <div style={{background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#0f766e',marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
          <span>Showing workers for one supplier company.</span>
          <Link href="/workers" className="btn btn-secondary btn-sm">Clear supplier filter</Link>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:10,marginBottom:4}}>
        {[['All',workers.filter(isActiveWorker).length, workers.filter(isInactiveWorker).length],['Permanent Staff',workers.filter(w=>w.category==='Permanent Staff'&&isActiveWorker(w)).length, workers.filter(w=>w.category==='Permanent Staff'&&isInactiveWorker(w)).length],['Contract',workers.filter(w=>w.category==='Contract Worker'&&isActiveWorker(w)).length, workers.filter(w=>w.category==='Contract Worker'&&isInactiveWorker(w)).length],['Subcontract Worker',workers.filter(w=>w.category==='Subcontract Worker'&&isActiveWorker(w)).length, workers.filter(w=>w.category==='Subcontract Worker'&&isInactiveWorker(w)).length],['Office Staff',workers.filter(w=>w.category==='Office Staff'&&isActiveWorker(w)).length, workers.filter(w=>w.category==='Office Staff'&&isInactiveWorker(w)).length]].map(([label,activeCount,inactiveCount]) => (
          <div key={label} className="stat-card" style={{cursor:'pointer'}} onClick={() => setCategoryFilter(label === 'All' ? 'all' : label === 'Contract' ? 'Contract Worker' : label)}>
            <div className="num teal" style={{fontSize:20}}>{activeCount}</div>
            <div className="lbl">{label}</div>
            {inactiveCount > 0 && <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>+ {inactiveCount} inactive on file</div>}
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="toolbar">
          <input className="search-input" placeholder="Search name, number, or role..." value={search} onChange={e => setSearch(e.target.value)} style={{flex:1}} />
          <select className="filter-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        {filtered.length === 0 ? <div className="empty-state"><h3>No workers found</h3><p>Try adjusting your search or filters.</p></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Worker</th><th>Role</th><th>Category</th><th>Payroll</th><th>Site</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filtered.map(w => (
                  <tr key={w.id} style={{opacity:isInactiveWorker(w)?0.6:1,borderLeft:isInactiveWorker(w)?'3px solid #94a3b8':''}}>
                    <td><div style={{display:'flex',alignItems:'center',gap:8}}><WorkerAvatar workerId={w.id} name={w.full_name} size={32} photoUrl={photoLookupReady ? (workerPhotoUrls[w.id] ?? null) : undefined} /><div><div style={{fontWeight:500}}>{w.full_name}</div><div style={{fontSize:11,color:'var(--hint)'}}>{w.worker_number}</div></div></div></td>
                    <td>{w.trade_role}</td>
                    <td>
                      <StatusBadge label={w.category} tone={w.category === 'Subcontract Worker' ? 'neutral' : w.category === 'Office Staff' ? 'info' : 'neutral'} />
                      {w.category === 'Subcontract Worker' && w.subcontractor_company && <div style={{fontSize:11,color:'var(--hint)',marginTop:2}}>{w.subcontractor_company}</div>}
                    </td>
                    <td>
                      <div style={{fontSize:12}}>{isMonthlyCategory(w) ? formatCurrency(w.monthly_salary) + '/mo' : formatCurrency(w.hourly_rate) + '/hr'}</div>
                      {w.category === 'Subcontract Worker' && w.subcontractor_billing_rate && <div style={{fontSize:11,color:'var(--hint)'}}>Bill: {formatCurrency(w.subcontractor_billing_rate)}/hr</div>}
                    </td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{w.project_site}</td>
                    <td><StatusBadge label={w.status} tone={getStatusTone(w.status)} /></td>
                    <td><Link href={`/workers/${w.id}`} className="btn btn-secondary btn-sm">Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}
