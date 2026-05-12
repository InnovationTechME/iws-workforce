'use client'

import { useEffect, useState } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getAuditLogs } from '../../lib/auditService'
import { formatDate } from '../../lib/utils'

function actionTone(action) {
  return { INSERT: 'success', UPDATE: 'info', DELETE: 'danger' }[action] || 'neutral'
}

export default function AuditLogPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const logs = await getAuditLogs()
        if (!cancelled) setRows(logs)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load audit log')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = rows.filter(row => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [row.table_name, row.record_id, row.action, row.actor_role, row.source]
      .some(value => String(value || '').toLowerCase().includes(q))
  })

  return (
    <AppShell pageTitle="Audit Log">
      <PageHeader eyebrow="Safety" title="Audit log" description="Database-level record of create, update, and delete actions." />
      {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 12px',fontSize:13,color:'#991b1b',marginBottom:12}}>{error}</div>}
      <input className="form-input" style={{maxWidth:360,marginBottom:12}} placeholder="Search table, action, record id..." value={query} onChange={e => setQuery(e.target.value)} />
      <div className="panel">
        {loading ? <div className="empty-state"><p>Loading...</p></div> : filtered.length === 0 ? (
          <div className="empty-state"><h3>No audit records found</h3></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>When</th><th>Action</th><th>Table</th><th>Record</th><th>Role</th><th>Source</th></tr></thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id}>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(row.created_at)}</td>
                    <td><StatusBadge label={row.action} tone={actionTone(row.action)} /></td>
                    <td style={{fontWeight:600}}>{row.table_name}</td>
                    <td style={{fontSize:11,fontFamily:'monospace',color:'var(--muted)'}}>{row.record_id || '-'}</td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{row.actor_role || '-'}</td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{row.source}</td>
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
