'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getPackCoverage } from '../../lib/mockStore'

export default function PacksPage() {
  const [coverage, setCoverage] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => { setCoverage(getPackCoverage()) }, [])

  const filtered = filter === 'all' ? coverage : filter === 'ready' ? coverage.filter(p => p.available_count === p.required_count) : coverage.filter(p => p.available_count < p.required_count)

  const ready = coverage.filter(p => p.available_count === p.required_count).length
  const blocked = coverage.filter(p => p.available_count < p.required_count).length
  const totalMissing = coverage.reduce((s,p) => s + (p.required_count - p.available_count), 0)

  return (
    <AppShell pageTitle="Packs">
      <PageHeader eyebrow="Packs" title="Pack readiness queue" description="Worker document packs for client submission. Required: passport, Emirates ID, medical insurance, workers compensation, certificates, photo, CV." />

      <div className="summary-strip">
        <div className="stat-card"><div className="num success" style={{fontSize:20}}>{ready}</div><div className="lbl">Pack ready</div></div>
        <div className="stat-card"><div className="num danger" style={{fontSize:20}}>{blocked}</div><div className="lbl">Blocked</div></div>
        <div className="stat-card"><div className="num warning" style={{fontSize:20}}>{totalMissing}</div><div className="lbl">Missing items</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{coverage.length}</div><div className="lbl">Workers assessed</div></div>
      </div>

      <div className="panel">
        <div className="toolbar">
          {[['all','All packs'],['ready','Ready'],['blocked','Blocked']].map(([key,label]) => (
            <button key={key} className={`btn btn-sm ${filter===key?'btn-teal':'btn-secondary'}`} onClick={() => setFilter(key)}>{label}</button>
          ))}
        </div>
        {filtered.length === 0 ? <div className="empty-state"><h3>No packs in this view</h3></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Worker</th><th>Category</th><th>Status</th><th>Coverage</th><th>Missing</th><th>Open</th></tr></thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.worker_id}>
                    <td style={{fontWeight:500}}>{p.worker_name}<div style={{fontSize:11,color:'var(--hint)'}}>{p.worker_number}</div></td>
                    <td><StatusBadge label={p.category} tone="neutral" /></td>
                    <td><StatusBadge label={p.available_count === p.required_count ? 'Ready' : 'Blocked'} tone={p.available_count === p.required_count ? 'success' : 'danger'} /></td>
                    <td><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{flex:1,height:4,background:'var(--border)',borderRadius:2}}><div style={{width:`${(p.available_count/p.required_count)*100}%`,height:'100%',background:p.available_count===p.required_count?'var(--success)':'var(--warning)',borderRadius:2}} /></div><span style={{fontSize:11,color:'var(--muted)',whiteSpace:'nowrap'}}>{p.available_count}/{p.required_count}</span></div></td>
                    <td style={{fontSize:12,color:'var(--danger)'}}>{p.missing_types.join(', ')}</td>
                    <td><Link href={`/workers/${p.worker_id}`} className="btn btn-secondary btn-sm">Open</Link></td>
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
