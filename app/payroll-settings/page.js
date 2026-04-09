'use client'
import { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getPublicHolidays, addPublicHoliday, removePublicHoliday, getRamadanMode, setRamadanMode, makeId } from '../../lib/mockStore'
import { formatDate } from '../../lib/utils'

export default function PayrollSettingsPage() {
  const [holidays, setHolidays] = useState([])
  const [ramadan, setRamadan] = useState(null)
  const [showAddHoliday, setShowAddHoliday] = useState(false)
  const [showRamadanForm, setShowRamadanForm] = useState(false)
  const [hForm, setHForm] = useState({ date:'', name:'', type:'manual' })
  const [rForm, setRForm] = useState({ start_date:'2026-03-01', end_date:'2026-03-29' })

  useEffect(() => { setHolidays(getPublicHolidays()); setRamadan(getRamadanMode()) }, [])

  const refresh = () => { setHolidays(getPublicHolidays()); setRamadan(getRamadanMode()) }

  const handleAddHoliday = () => {
    if (!hForm.date || !hForm.name) return
    addPublicHoliday({ id: makeId('ph'), ...hForm, declared_by: 'HR Admin' })
    setHForm({ date:'', name:'', type:'manual' }); setShowAddHoliday(false); refresh()
  }

  const published = holidays.filter(h => h.type === 'published')
  const manual = holidays.filter(h => h.type === 'manual')

  return (
    <AppShell pageTitle="Payroll Settings">
      <PageHeader eyebrow="Payroll Settings" title="Public holidays & Ramadan mode" description="Manage UAE public holidays and special payroll modes. These affect OT calculation across all timesheet entries." />

      <div style={{background: ramadan?.active ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : '#f8fafc', border: ramadan?.active ? 'none' : '1.5px solid #e2e8f0', borderRadius:12, padding:'20px 24px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color: ramadan?.active ? 'white' : '#0f172a',marginBottom:4,display:'flex',alignItems:'center',gap:8}}>
            🌙 Ramadan Payroll Mode
            {ramadan?.active && <span style={{background:'rgba(255,255,255,0.2)',padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:600}}>ACTIVE</span>}
          </div>
          {ramadan?.active ? (
            <div style={{fontSize:12,color:'rgba(255,255,255,0.85)',lineHeight:1.7}}>Active: {formatDate(ramadan.start_date)} — {formatDate(ramadan.end_date)}<br/>Rules: Full pay for 6hrs work · Minimum 5hrs to avoid absent · Hours above 6 = OT1 (125%)</div>
          ) : (
            <div style={{fontSize:12,color:'#64748b',lineHeight:1.7}}>Inactive — standard OT rules apply (8hr threshold)<br/>Activate before Ramadan begins to adjust OT calculations automatically</div>
          )}
        </div>
        <div style={{display:'flex',gap:8,flexShrink:0}}>
          {ramadan?.active ? (
            <button className="btn btn-secondary" onClick={() => { setRamadanMode(false,null,null,null); refresh() }} style={{background:'rgba(255,255,255,0.15)',color:'white',border:'1px solid rgba(255,255,255,0.3)'}}>✓ Mark Ramadan Complete</button>
          ) : (
            <button className="btn btn-primary" style={{background:'#7c3aed',borderColor:'#7c3aed'}} onClick={() => setShowRamadanForm(true)}>🌙 Activate Ramadan Mode</button>
          )}
        </div>
      </div>

      {showRamadanForm && (
        <div style={{background:'#faf5ff',border:'1px solid #d8b4fe',borderRadius:8,padding:16,marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:600,color:'#7c3aed',marginBottom:12}}>Set Ramadan dates</div>
          <div style={{display:'flex',gap:12,alignItems:'flex-end'}}>
            <div className="form-field"><label className="form-label">Start</label><input className="form-input" type="date" value={rForm.start_date} onChange={e=>setRForm({...rForm,start_date:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">End</label><input className="form-input" type="date" value={rForm.end_date} onChange={e=>setRForm({...rForm,end_date:e.target.value})} /></div>
            <button className="btn btn-primary" style={{background:'#7c3aed',borderColor:'#7c3aed'}} onClick={() => { setRamadanMode(true,rForm.start_date,rForm.end_date,'HR Admin'); setShowRamadanForm(false); refresh() }}>Activate</button>
            <button className="btn btn-secondary" onClick={()=>setShowRamadanForm(false)}>Cancel</button>
          </div>
          <div style={{fontSize:11,color:'#7c3aed',marginTop:8}}>During Ramadan: OT threshold changes from 8hrs to 6hrs. Monthly salaries unchanged.</div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <div className="panel">
          <div className="panel-header"><div><h2>📅 UAE Public Holidays 2026</h2><p>Published calendar</p></div></div>
          <div className="table-wrap"><table>
            <thead><tr><th>Date</th><th>Holiday</th><th>Type</th></tr></thead>
            <tbody>{published.map(h => (<tr key={h.id}><td style={{fontFamily:'monospace',fontSize:12,fontWeight:600,color:'var(--teal)'}}>{h.date}</td><td style={{fontSize:13,fontWeight:500}}>{h.name}</td><td><StatusBadge label="Published" tone="info" /></td></tr>))}</tbody>
          </table></div>
        </div>

        <div className="panel">
          <div className="panel-header"><div><h2>📌 Manually Declared Holidays</h2><p>Additional days declared by management</p></div><button className="btn btn-primary btn-sm" onClick={() => setShowAddHoliday(true)}>+ Declare Holiday</button></div>
          {showAddHoliday && (
            <div style={{background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:6,padding:12,marginBottom:12}}>
              <div style={{display:'flex',gap:8,alignItems:'flex-end',flexWrap:'wrap'}}>
                <div className="form-field" style={{margin:0}}><label className="form-label">Date</label><input className="form-input" type="date" value={hForm.date} onChange={e=>setHForm({...hForm,date:e.target.value})} /></div>
                <div className="form-field" style={{flex:1,margin:0}}><label className="form-label">Holiday name</label><input className="form-input" value={hForm.name} placeholder="e.g. Company Foundation Day" onChange={e=>setHForm({...hForm,name:e.target.value})} /></div>
                <button className="btn btn-teal btn-sm" onClick={handleAddHoliday}>Add</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>setShowAddHoliday(false)}>Cancel</button>
              </div>
            </div>
          )}
          {manual.length === 0 ? <div style={{fontSize:13,color:'var(--hint)',padding:'12px 0'}}>No manually declared holidays.</div> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Date</th><th>Name</th><th>By</th><th></th></tr></thead>
              <tbody>{manual.map(h => (<tr key={h.id}><td style={{fontFamily:'monospace',fontSize:12,fontWeight:600,color:'#d97706'}}>{h.date}</td><td style={{fontSize:13,fontWeight:500}}>{h.name}</td><td style={{fontSize:11,color:'var(--muted)'}}>{h.declared_by}</td><td><button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={() => { removePublicHoliday(h.id); refresh() }}>Remove</button></td></tr>))}</tbody>
            </table></div>
          )}
        </div>
      </div>

      <div className="panel" style={{marginTop:16}}>
        <div className="panel-header"><div><h2>Current payroll rules in effect</h2></div></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          {[['OT threshold', ramadan?.active ? '6 hours (Ramadan)' : '8 hours (standard)', ramadan?.active ? '#7c3aed' : 'var(--teal)'],['OT1 rate', '125% of hourly rate', 'var(--teal)'],['Public holiday rate', '150% of hourly rate', '#d97706'],['Flat workers', 'No OT premium — flat rate only', '#64748b']].map(([label, value, color]) => (
            <div key={label} style={{background:'#f8fafc',borderRadius:8,padding:'12px 14px',border:'1px solid #e2e8f0'}}>
              <div style={{fontSize:10,color:'#94a3b8',fontWeight:600,textTransform:'uppercase',marginBottom:4}}>{label}</div>
              <div style={{fontSize:13,fontWeight:600,color}}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
