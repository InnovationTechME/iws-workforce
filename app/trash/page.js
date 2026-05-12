'use client'

import { useEffect, useState } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getDeletedRecords, markDeletedRecordIgnored, restoreDeletedRecord } from '../../lib/auditService'
import { formatDate } from '../../lib/utils'

function statusTone(status) {
  return { available: 'warning', restored: 'success', ignored: 'neutral' }[status] || 'neutral'
}

function recordTitle(row) {
  const data = row.record_data || {}
  return data.full_name || data.name || data.worker_number || data.ref_number || data.month_label || row.record_id || '-'
}

export default function TrashPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await getDeletedRecords())
    } catch (err) {
      setError(err.message || 'Could not load deleted records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const restore = async (row) => {
    setBusy(row.id)
    setError('')
    try {
      await restoreDeletedRecord(row)
      await refresh()
    } catch (err) {
      setError(err.message || 'Restore failed')
    } finally {
      setBusy(null)
    }
  }

  const ignore = async (row) => {
    setBusy(row.id)
    setError('')
    try {
      await markDeletedRecordIgnored(row.id)
      await refresh()
    } catch (err) {
      setError(err.message || 'Could not update deleted record')
    } finally {
      setBusy(null)
    }
  }

  return (
    <AppShell pageTitle="Trash & Restore">
      <PageHeader eyebrow="Safety" title="Trash and restore" description="Deleted operational rows are captured here for review and recovery." />
      {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 12px',fontSize:13,color:'#991b1b',marginBottom:12}}>{error}</div>}
      <div className="panel">
        {loading ? <div className="empty-state"><p>Loading...</p></div> : rows.length === 0 ? (
          <div className="empty-state"><h3>No deleted records captured</h3><p>Future deletes from audited tables will appear here.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Deleted</th><th>Table</th><th>Record</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(row.deleted_at)}</td>
                    <td style={{fontWeight:600}}>{row.source_table}</td>
                    <td><div style={{fontWeight:600,fontSize:13}}>{recordTitle(row)}</div><div style={{fontSize:11,fontFamily:'monospace',color:'var(--hint)'}}>{row.record_id}</div></td>
                    <td><StatusBadge label={row.restore_status} tone={statusTone(row.restore_status)} /></td>
                    <td>
                      {row.restore_status === 'available' && (
                        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                          <button className="btn btn-secondary btn-sm" disabled={busy === row.id} onClick={() => restore(row)}>{busy === row.id ? 'Working...' : 'Restore'}</button>
                          <button className="btn btn-ghost btn-sm" disabled={busy === row.id} onClick={() => ignore(row)}>Ignore</button>
                        </div>
                      )}
                    </td>
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
