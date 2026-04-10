'use client'
import { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import TimesheetCalendar from '../../components/TimesheetCalendar'
import DrawerForm from '../../components/DrawerForm'
import { getTimesheetHeaders, getTimesheetLines, addTimesheetHeader, addTimesheetLine, updateTimesheetHeader, getWorkers, makeId } from '../../lib/mockStore'
import { formatDate } from '../../lib/utils'
import { parseClientTimesheet, validateTimesheetMonth } from '../../lib/excelParser'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const toneMap = { checked:'success', approved:'success', matched:'success', pending:'danger', pending_owner:'warning', under_review:'warning', client_clarification:'warning', not_required:'neutral' }

export default function TimesheetsPage() {
  const [headers, setHeaders] = useState([])
  const [selected, setSelected] = useState(null)
  const [lines, setLines] = useState([])
  const [workers, setWorkers] = useState([])
  const [view, setView] = useState('list')
  const [selectedMonth, setSelectedMonth] = useState('April')
  const [selectedYear, setSelectedYear] = useState('2026')
  const [selectedClient, setSelectedClient] = useState('ADSB')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const [matchedWorkers, setMatchedWorkers] = useState([])
  const [validationResult, setValidationResult] = useState(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showHeaderDrawer, setShowHeaderDrawer] = useState(false)
  const [hForm, setHForm] = useState({ client_name:'', project_site:'', vessel_name:'', job_no:'', date:'', source_type:'manual' })

  useEffect(() => { setHeaders(getTimesheetHeaders()); setWorkers(getWorkers()) }, [])
  useEffect(() => { if (selected) setLines(getTimesheetLines(selected.id)) }, [selected])

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true); setUploadedFile(file)
    try {
      const data = await parseClientTimesheet(file)
      setParsedData(data)
      const validation = validateTimesheetMonth(data, selectedMonth, selectedYear)
      setValidationResult(validation)
      const matched = data.workers.map(tsW => {
        let iwsW = workers.find(w => w.client_worker_ids?.[selectedClient] === tsW.client_worker_id)
        if (!iwsW && tsW.worker_name) iwsW = workers.find(w => w.full_name.toLowerCase().includes(tsW.worker_name.split(' ')[0].toLowerCase()))
        return { ...tsW, iws_worker_id: iwsW?.id||null, iws_worker_name: iwsW?.full_name||null, iws_worker_number: iwsW?.worker_number||null, matched: !!iwsW }
      })
      setMatchedWorkers(matched)
    } catch(err) { alert('Error parsing file: ' + err.message) }
    setUploading(false)
  }

  const daysInSelectedMonth = new Date(parseInt(selectedYear), MONTHS.indexOf(selectedMonth)+1, 0).getDate()

  const handleSaveTimesheet = () => {
    const id = makeId('ts')
    addTimesheetHeader({ id, client_name: selectedClient, project_site: selectedClient, vessel_name:'', job_no: selectedClient+'-'+selectedMonth.slice(0,3)+'-'+selectedYear, date: selectedYear+'-'+String(MONTHS.indexOf(selectedMonth)+1).padStart(2,'0')+'-01', source_type:'excel', source_file_name: uploadedFile?.name||'upload', hr_check_status:'pending', operations_check_status:'pending', final_approval_status:'pending', reconciliation_status:'pending' })
    matchedWorkers.filter(w => w.matched).forEach(w => {
      let regHrs = 0, otHrs = 0
      w.daily_hours.forEach(h => { if (h <= 8) regHrs += h; else { regHrs += 8; otHrs += (h-8) } })
      addTimesheetLine({ id:makeId('tl'), header_id:id, worker_id:w.iws_worker_id, worker_name:w.iws_worker_name||w.worker_name, worker_number:w.iws_worker_number||'', trade_role:w.trade||'', work_date:selectedYear+'-'+String(MONTHS.indexOf(selectedMonth)+1).padStart(2,'0')+'-01', start_time:'07:00', end_time:'17:00', total_hours:regHrs+otHrs, normal_hours:regHrs, ot_hours:otHrs, holiday_hours:0, remarks:'Imported from client Excel' })
    })
    setHeaders(getTimesheetHeaders())
    setUploadedFile(null); setParsedData(null); setMatchedWorkers([]); setValidationResult(null); setShowCalendar(false); setView('list')
  }

  const handleApproval = (headerId, field, value) => {
    updateTimesheetHeader(headerId, { [field]: value })
    setHeaders(getTimesheetHeaders())
    if (selected?.id === headerId) setSelected(getTimesheetHeaders().find(h => h.id === headerId))
  }

  const handleAddHeader = () => {
    addTimesheetHeader({ ...hForm, id:makeId('th'), hr_check_status:'pending', operations_check_status:'pending', final_approval_status:'pending', reconciliation_status:'pending' })
    setHeaders(getTimesheetHeaders()); setShowHeaderDrawer(false)
  }

  const pending = headers.filter(h => h.final_approval_status === 'pending' || h.final_approval_status === 'pending_owner').length

  return (
    <AppShell pageTitle="Timesheets">
      <PageHeader eyebrow="Timesheets" title="Client timesheets" description="Upload client Excel timesheets, review hours in calendar view, and approve for payroll."
        actions={<div style={{display:'flex',gap:8}}>
          <button className="btn btn-primary" onClick={() => setView('upload')}>📁 Upload Client Timesheet</button>
          <button className="btn btn-secondary" onClick={() => setShowHeaderDrawer(true)}>+ Manual Entry</button>
        </div>} />

      <div className="summary-strip">
        <div className="stat-card"><div className={`num ${pending>0?'warning':''}`} style={{fontSize:20}}>{pending}</div><div className="lbl">Pending approval</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{headers.filter(h=>h.hr_check_status!=='checked').length}</div><div className="lbl">HR pending</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{headers.filter(h=>h.operations_check_status==='pending').length}</div><div className="lbl">Ops pending</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{headers.filter(h=>h.final_approval_status==='approved').length}</div><div className="lbl">Approved</div></div>
      </div>

      <div className="tabs" style={{marginBottom:0}}>
        {[['list','📋 Timesheet List'],['upload','📁 Upload & Review']].map(([key,label]) => (
          <button key={key} className={`tab${view===key?' active':''}`} onClick={() => setView(key)}>{label}</button>
        ))}
      </div>

      {view === 'list' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div className="panel" style={{borderTopLeftRadius:0}}>
            <div className="panel-header"><div><h2>Timesheet headers</h2></div></div>
            {headers.length === 0 ? <div className="empty-state"><h3>No timesheets yet</h3><p>Upload a client Excel file or add manually.</p></div> : (
              <div className="table-wrap"><table>
                <thead><tr><th>Date</th><th>Client / site</th><th>Status</th></tr></thead>
                <tbody>{headers.map(h => (
                  <tr key={h.id} style={{cursor:'pointer',background:selected?.id===h.id?'#eff6ff':''}} onClick={() => setSelected(h)}>
                    <td style={{fontSize:12}}>{formatDate(h.date)}<div style={{fontSize:11,color:'var(--hint)'}}>{h.job_no}</div></td>
                    <td style={{fontWeight:500}}>{h.client_name}<div style={{fontSize:11,color:'var(--hint)'}}>{h.project_site}</div></td>
                    <td><StatusBadge label={h.final_approval_status} tone={toneMap[h.final_approval_status]||'neutral'} /></td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </div>
          {selected && (
            <div className="panel">
              <div className="panel-header"><div><h2>{selected.client_name}</h2><p>{selected.project_site} · {selected.job_no}</p></div></div>
              <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
                <StatusBadge label={'HR: '+selected.hr_check_status} tone={toneMap[selected.hr_check_status]||'neutral'} />
                <StatusBadge label={'Ops: '+selected.operations_check_status} tone={toneMap[selected.operations_check_status]||'neutral'} />
                <StatusBadge label={'Final: '+selected.final_approval_status} tone={toneMap[selected.final_approval_status]||'neutral'} />
              </div>
              <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
                {selected.hr_check_status === 'pending' && <button className="btn btn-teal btn-sm" onClick={() => handleApproval(selected.id,'hr_check_status','checked')}>✓ HR Check</button>}
                {selected.operations_check_status === 'pending' && <button className="btn btn-teal btn-sm" onClick={() => handleApproval(selected.id,'operations_check_status','checked')}>✓ Ops Check</button>}
                {(selected.final_approval_status === 'pending' || selected.final_approval_status === 'pending_owner') && <button className="btn btn-primary btn-sm" onClick={() => handleApproval(selected.id,'final_approval_status','approved')}>✓ Final Approve</button>}
              </div>
              <div className="table-wrap"><table>
                <thead><tr><th>Worker</th><th>Total</th><th>Normal</th><th>OT</th><th>Holiday</th></tr></thead>
                <tbody>{lines.length === 0 ? <tr><td colSpan={5} style={{textAlign:'center',color:'var(--hint)',padding:24}}>No lines</td></tr> : lines.map(l => (
                  <tr key={l.id}>
                    <td style={{fontWeight:500}}>{l.worker_name}<div style={{fontSize:11,color:'var(--hint)'}}>{l.worker_number}</div></td>
                    <td>{l.total_hours}h</td><td>{l.normal_hours}h</td><td style={{color:l.ot_hours>0?'var(--warning)':'var(--hint)',fontWeight:l.ot_hours>0?600:400}}>{l.ot_hours}h</td><td>{l.holiday_hours}h</td>
                  </tr>
                ))}</tbody>
              </table></div>
            </div>
          )}
        </div>
      )}

      {view === 'upload' && (
        <div className="panel" style={{borderTopLeftRadius:0}}>
          {!showCalendar ? (<>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
              <div className="form-field"><label className="form-label">Month</label><select className="form-select" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}>{MONTHS.map(m=><option key={m}>{m}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Year</label><select className="form-select" value={selectedYear} onChange={e=>setSelectedYear(e.target.value)}><option>2025</option><option>2026</option><option>2027</option></select></div>
              <div className="form-field"><label className="form-label">Client</label><select className="form-select" value={selectedClient} onChange={e=>setSelectedClient(e.target.value)}><option value="ADSB">ADSB</option><option value="ADNOC">ADNOC</option><option value="NPCC">NPCC</option><option value="default">Other</option></select></div>
            </div>
            <div style={{border:'2px dashed var(--border)',borderRadius:10,padding:32,textAlign:'center',marginBottom:16}}>
              <div style={{fontSize:32,marginBottom:8}}>📊</div>
              <label style={{display:'inline-block',padding:'10px 20px',background:'var(--teal)',color:'white',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:600}}>
                {uploading ? 'Processing...' : 'Choose Excel File (.xlsx)'}
                <input type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={handleFileUpload} disabled={uploading} />
              </label>
              <div style={{fontSize:11,color:'var(--hint)',marginTop:8}}>Format: Client ID | Name | Trade | Day 1-31 hours</div>
            </div>
            {uploadedFile && <div style={{background:'var(--teal-bg)',border:'1px solid var(--teal-border)',borderRadius:8,padding:'12px 16px',marginBottom:12}}><div style={{fontWeight:500}}>📎 {uploadedFile.name}</div>{parsedData && <div style={{fontSize:12,color:'var(--muted)',marginTop:4}}>✓ Parsed {parsedData.workers.length} workers · {parsedData.month||'?'} {parsedData.year||'?'}</div>}</div>}
            {validationResult && !validationResult.valid && validationResult.error && (
              <div style={{background:'var(--danger-bg)',border:'1px solid var(--danger-border)',borderRadius:8,padding:'12px 16px',marginBottom:12}}>
                <div style={{fontWeight:600,color:'var(--danger)',marginBottom:4}}>⚠️ Month Mismatch</div>
                <div style={{fontSize:12,color:'var(--danger)'}}>{validationResult.error}</div>
                <div style={{display:'flex',gap:8,marginTop:10}}><button className="btn btn-danger btn-sm" onClick={() => setShowCalendar(true)}>Upload Anyway</button><button className="btn btn-secondary btn-sm" onClick={() => {setUploadedFile(null);setParsedData(null);setValidationResult(null)}}>Cancel</button></div>
              </div>
            )}
            {validationResult?.valid && (
              <div style={{background:'var(--success-bg)',border:'1px solid var(--success-border)',borderRadius:8,padding:'12px 16px',marginBottom:12}}>
                <div style={{fontWeight:600,color:'var(--success)'}}>✓ Month validated — {validationResult.file_month}</div>
                <button className="btn btn-teal" style={{marginTop:10}} onClick={() => setShowCalendar(true)}>Review Calendar →</button>
              </div>
            )}
            {matchedWorkers.length > 0 && !showCalendar && (
              <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:16,marginTop:12}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>Worker Matching</div>
                <div style={{display:'flex',gap:16,marginBottom:12}}>
                  <div style={{fontSize:12}}><span style={{color:'var(--success)',fontWeight:600}}>✓ Matched:</span> {matchedWorkers.filter(w=>w.matched).length}</div>
                  <div style={{fontSize:12}}><span style={{color:'var(--danger)',fontWeight:600}}>✗ Unmatched:</span> {matchedWorkers.filter(w=>!w.matched).length}</div>
                </div>
                {matchedWorkers.filter(w=>!w.matched).length > 0 && (
                  <div style={{background:'var(--danger-bg)',borderRadius:6,padding:'8px 12px',fontSize:12}}>
                    {matchedWorkers.filter(w=>!w.matched).map((w,i) => <div key={i} style={{color:'var(--danger)'}}>{w.client_worker_id} — {w.worker_name}</div>)}
                  </div>
                )}
              </div>
            )}
          </>) : (
            <div>
              <TimesheetCalendar
                timesheetData={matchedWorkers.filter(w=>w.matched).map(w => ({ worker_id: w.iws_worker_number||w.client_worker_id, worker_name: w.iws_worker_name||w.worker_name, client_worker_id: w.client_worker_id, daily_hours: w.daily_hours.slice(0, daysInSelectedMonth) }))}
                month={selectedMonth + ' ' + selectedYear}
                daysInMonth={daysInSelectedMonth}
              />
              <div style={{display:'flex',gap:12,marginTop:20}}>
                <button className="btn btn-primary" onClick={handleSaveTimesheet}>✓ Save & Submit for Approval</button>
                <button className="btn btn-secondary" onClick={() => setShowCalendar(false)}>← Back to Upload</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showHeaderDrawer && (
        <DrawerForm title="Add Timesheet Header" onClose={() => setShowHeaderDrawer(false)}
          footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button className="btn btn-secondary" onClick={() => setShowHeaderDrawer(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAddHeader}>Add</button></div>}>
          <div className="form-grid">
            <div className="form-field"><label className="form-label">Client name</label><input className="form-input" value={hForm.client_name} onChange={e => setHForm({...hForm,client_name:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Project site</label><input className="form-input" value={hForm.project_site} onChange={e => setHForm({...hForm,project_site:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Job number</label><input className="form-input" value={hForm.job_no} onChange={e => setHForm({...hForm,job_no:e.target.value})} /></div>
            <div className="form-field"><label className="form-label">Date</label><input className="form-input" type="date" value={hForm.date} onChange={e => setHForm({...hForm,date:e.target.value})} /></div>
          </div>
        </DrawerForm>
      )}
    </AppShell>
  )
}
