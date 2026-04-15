'use client'
import { useEffect, useState } from 'react'
import {
  listWorkExperience,
  addPastExperience,
  updatePastExperience,
  deletePastExperience,
} from '../lib/workExperienceService'
import { formatDate } from '../lib/utils'

// §5.3.8 — Work Experience on the worker profile.
// The system-created "Innovation Technologies LLC O.P.C." row (is_current,
// system_created) is rendered read-only with no delete/edit controls; past
// experiences added by HR are editable and deletable. The server-side
// service layer also refuses to update/delete system_created rows.
export default function WorkExperienceSection({ worker }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ company_name: '', position: '', from_date: '', to_date: '' })
  const [saving, setSaving] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      setRows(await listWorkExperience(worker.id))
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (worker?.id) refresh() }, [worker?.id])

  const openAdd = () => {
    setEditing(null)
    setForm({ company_name: '', position: '', from_date: '', to_date: '' })
    setShowForm(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({
      company_name: row.company_name || '',
      position: row.position || '',
      from_date: row.from_date || '',
      to_date: row.to_date || '',
    })
    setShowForm(true)
  }

  const onSave = async () => {
    if (!form.company_name.trim()) { setError('Company name is required'); return }
    setSaving(true); setError(null)
    try {
      if (editing) await updatePastExperience(editing.id, form)
      else await addPastExperience(worker.id, form)
      setShowForm(false)
      await refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (row) => {
    if (!confirm(`Delete work experience at ${row.company_name}?`)) return
    try { await deletePastExperience(row.id); await refresh() }
    catch (e) { setError(e.message) }
  }

  return (
    <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:8,padding:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <h3 style={{margin:0,fontSize:14,fontWeight:700,color:'#0891b2'}}>Work Experience</h3>
        <button className="btn btn-teal btn-sm" onClick={openAdd}>+ Add past experience</button>
      </div>

      {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:6,padding:'8px 12px',color:'#991b1b',fontSize:12,marginBottom:10}}>⚠ {error}</div>}

      {loading ? (
        <div style={{fontSize:12,color:'var(--hint)'}}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{fontSize:12,color:'var(--hint)',fontStyle:'italic'}}>No work experience on file.</div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {rows.map(r => {
            const isSystem = r.is_current && r.system_created
            return (
              <div key={r.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',border:'1px solid var(--border)',borderRadius:6,background:isSystem?'#f0fdfa':'#fff'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:isSystem?'#0d9488':'#1e293b'}}>
                    {r.company_name}
                    {isSystem && <span style={{marginLeft:8,fontSize:10,fontWeight:700,color:'#fff',background:'#0d9488',padding:'2px 6px',borderRadius:10}}>CURRENT</span>}
                  </div>
                  <div style={{fontSize:12,color:'var(--muted)'}}>
                    {r.position || '—'}
                    <span style={{color:'var(--hint)'}}>
                      {' · '}
                      {r.from_date ? formatDate(r.from_date) : '—'}
                      {' — '}
                      {r.is_current ? 'Present' : (r.to_date ? formatDate(r.to_date) : '—')}
                    </span>
                  </div>
                </div>
                {!isSystem && (
                  <>
                    <button className="btn btn-sm" onClick={() => openEdit(r)}>Edit</button>
                    <button className="btn btn-sm" style={{color:'#dc2626'}} onClick={() => onDelete(r)}>Delete</button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div style={{marginTop:12,padding:12,border:'1px dashed var(--border)',borderRadius:6,background:'#f8fafc'}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:0.5,marginBottom:10}}>
            {editing ? 'Edit past experience' : 'Add past experience'}
          </div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Company name *</label>
              <input className="form-input" value={form.company_name} onChange={e => setForm(f => ({...f, company_name: e.target.value}))} />
            </div>
            <div className="form-field">
              <label className="form-label">Position</label>
              <input className="form-input" value={form.position} onChange={e => setForm(f => ({...f, position: e.target.value}))} />
            </div>
            <div className="form-field">
              <label className="form-label">From date</label>
              <input className="form-input" type="date" value={form.from_date} onChange={e => setForm(f => ({...f, from_date: e.target.value}))} />
            </div>
            <div className="form-field">
              <label className="form-label">To date</label>
              <input className="form-input" type="date" value={form.to_date} onChange={e => setForm(f => ({...f, to_date: e.target.value}))} />
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:10}}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-teal btn-sm" disabled={saving} onClick={onSave}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
