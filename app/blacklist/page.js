'use client'
import { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import DrawerForm from '../../components/DrawerForm'
import { getBlacklist, addToBlacklist, makeId } from '../../lib/mockStore'
import { formatDate } from '../../lib/utils'

export default function BlacklistPage() {
  const [entries, setEntries] = useState([])
  const [showDrawer, setShowDrawer] = useState(false)
  const [form, setForm] = useState({ full_name:'', passport_number:'', nationality:'', reason:'', blacklisted_by:'' })

  useEffect(() => { setEntries(getBlacklist()) }, [])

  const handleAdd = () => {
    addToBlacklist({ ...form, id: makeId('bl') })
    setEntries(getBlacklist())
    setShowDrawer(false)
  }

  return (
    <AppShell pageTitle="Blacklist">
      <PageHeader eyebrow="Blacklist" title="Blacklist register" description="Candidates barred from employment. Checked automatically during offer creation."
        actions={<button className="btn btn-danger" onClick={() => setShowDrawer(true)}>+ Add Entry</button>} />

      <div className="panel">
        {entries.length === 0 ? <div className="empty-state"><h3>No blacklist entries</h3><p>Entries are added automatically when a candidate fails medical or is manually added.</p></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Passport</th><th>Nationality</th><th>Reason</th><th>Date</th><th>By</th></tr></thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id}>
                    <td style={{fontWeight:500}}>{e.full_name}</td>
                    <td style={{fontFamily:'monospace',fontSize:12}}>{e.passport_number}</td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{e.nationality}</td>
                    <td style={{fontSize:12,maxWidth:260}}>{e.reason}</td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(e.blacklisted_at)}</td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{e.blacklisted_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDrawer && (
        <DrawerForm title="Add Blacklist Entry" onClose={() => setShowDrawer(false)}
          footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button className="btn btn-secondary" onClick={() => setShowDrawer(false)}>Cancel</button><button className="btn btn-danger" onClick={handleAdd}>Add to Blacklist</button></div>}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div className="form-grid">
              <div className="form-field"><label className="form-label">Full name</label><input className="form-input" value={form.full_name} onChange={e => setForm({...form,full_name:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Passport number</label><input className="form-input" value={form.passport_number} onChange={e => setForm({...form,passport_number:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Nationality</label><input className="form-input" value={form.nationality} onChange={e => setForm({...form,nationality:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Blacklisted by</label><input className="form-input" value={form.blacklisted_by} onChange={e => setForm({...form,blacklisted_by:e.target.value})} placeholder="HR Admin" /></div>
            </div>
            <div className="form-field"><label className="form-label">Reason *</label><textarea className="form-textarea" value={form.reason} onChange={e => setForm({...form,reason:e.target.value})} rows={3} placeholder="Reason for blacklisting" /></div>
          </div>
        </DrawerForm>
      )}
    </AppShell>
  )
}
