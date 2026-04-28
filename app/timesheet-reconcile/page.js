'use client'
import { useEffect, useState } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { supabase } from '../../lib/supabaseClient'
import { getVisibleWorkers } from '../../lib/workerService'
import { parseClientTimesheet, matchWorkerToIWS } from '../../lib/excelParser'
import { clearReconciliationReview, loadReconciliationReview, saveReconciliationReview } from '../../lib/timesheetReconciliationService'

export default function TimesheetReconcilePage() {
  const [headers, setHeaders] = useState([])
  const [workers, setWorkers] = useState([])
  const [selectedHeader, setSelectedHeader] = useState(null)
  const [iwsLines, setIwsLines] = useState([])
  const [clientData, setClientData] = useState([])
  const [discrepancies, setDiscrepancies] = useState([])
  const [comparing, setComparing] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [savedReview, setSavedReview] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: headerRows, error }, workerRows] = await Promise.all([
        supabase
          .from('timesheet_headers')
          .select('id, client_id, client_name, month, year, month_label, status')
          .order('year', { ascending: false })
          .order('month', { ascending: false }),
        getVisibleWorkers(),
      ])
      if (!error) setHeaders(headerRows || [])
      setWorkers(workerRows || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSelectHeader(header) {
    setSelectedHeader(header)
    setClientData([])
    setDiscrepancies([])
    setSavedReview(null)
    const { data, error } = await supabase
      .from('timesheet_lines')
      .select('id, worker_id, total_hours, worker:workers(full_name, worker_number)')
      .eq('header_id', header.id)
    if (error) {
      setIwsLines([])
      setUploadError(error.message)
      return
    }
    setIwsLines(data || [])
    const existingReview = loadReconciliationReview(header.id)
    if (existingReview) {
      setClientData(existingReview.clientData || [])
      setDiscrepancies(existingReview.discrepancies || [])
      setSavedReview(existingReview)
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadError(null)
    try {
      const parsed = await parseClientTimesheet(file)
      const rows = (parsed.workers || []).map(worker => ({
        client_id: worker.client_worker_id || worker.worker_number || '',
        name: worker.worker_name,
        trade: worker.trade,
        total_hours: Math.round(Number(worker.total_hours || 0) * 100) / 100,
        daily_hours: worker.daily_hours || [],
      }))
      setClientData(rows)
      setDiscrepancies([])
      setSavedReview(null)
    } catch (err) {
      setUploadError('Error reading file: ' + err.message)
    }
    e.target.value = ''
  }

  function handleCompare() {
    if (!selectedHeader || clientData.length === 0) return
    setComparing(true)
    const iwsByWorker = {}
    iwsLines.forEach(line => {
      const key = line.worker_id
      if (!iwsByWorker[key]) iwsByWorker[key] = { total: 0 }
      iwsByWorker[key].total += Number(line.total_hours || 0)
    })

    const next = []
    clientData.forEach((cw, index) => {
      let iwsWorker = workers.find(w => w.worker_number === cw.client_id)
      if (!iwsWorker) {
        iwsWorker = matchWorkerToIWS(cw.name, workers)?.worker || null
      }
      const iwsTotal = iwsWorker ? (iwsByWorker[iwsWorker.id]?.total || 0) : 0
      const difference = Math.round((cw.total_hours - iwsTotal) * 100) / 100
      if (Math.abs(difference) >= 0.5 || !iwsWorker) {
        next.push({
          id: `${selectedHeader.id}-${cw.client_id || index}`,
          client_id: cw.client_id,
          client_name: cw.name,
          client_trade: cw.trade,
          iws_worker_id: iwsWorker?.id || null,
          iws_worker_name: iwsWorker?.full_name || 'NOT MATCHED',
          iws_hours: Math.round(iwsTotal * 100) / 100,
          client_hours: cw.total_hours,
          difference,
          status: 'pending',
          resolution: null,
          matched: !!iwsWorker,
        })
      }
    })
    setDiscrepancies(next)
    const saved = saveReconciliationReview(selectedHeader.id, {
      header: selectedHeader,
      clientData,
      discrepancies: next,
      source: 'client_upload_compare',
    })
    setSavedReview(saved)
    setComparing(false)
  }

  function handleResolve(discId, resolution) {
    setDiscrepancies(prev => {
      const next = prev.map(d => d.id === discId
        ? { ...d, status: 'resolved', resolution, resolved_at: new Date().toISOString() }
        : d
      )
      if (selectedHeader) {
        const saved = saveReconciliationReview(selectedHeader.id, {
          header: selectedHeader,
          clientData,
          discrepancies: next,
          source: 'client_upload_compare',
        })
        setSavedReview(saved)
      }
      return next
    })
  }

  function handleClearReview() {
    if (!selectedHeader) return
    clearReconciliationReview(selectedHeader.id)
    setClientData([])
    setDiscrepancies([])
    setSavedReview(null)
  }

  const pending = discrepancies.filter(d => d.status === 'pending')
  const resolved = discrepancies.filter(d => d.status === 'resolved')
  const filtered = filter === 'pending' ? pending : filter === 'resolved' ? resolved : discrepancies
  const allResolved = pending.length === 0 && discrepancies.length > 0

  return (
    <AppShell pageTitle="Timesheet Reconciliation">
      <PageHeader eyebrow="Timesheet Reconciliation" title="Client timesheet comparison" description="Upload a client timesheet, compare it against IWS lines, and resolve visible differences before payroll runs." />

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,marginBottom:16}}>
        {[
          { label: '1 Select month', detail: selectedHeader ? selectedHeader.month_label || `${selectedHeader.month}/${selectedHeader.year}` : 'Choose a saved timesheet' },
          { label: '2 Upload client file', detail: clientData.length ? `${clientData.length} workers loaded` : 'Awaiting XLSX/CSV' },
          { label: '3 Compare and resolve', detail: discrepancies.length ? `${pending.length} pending` : 'No comparison yet' },
          { label: '4 Return to payroll', detail: allResolved ? 'Ready for payroll check' : 'Finish review first' },
        ].map(step => (
          <div key={step.label} style={{border:'1px solid #e2e8f0',background:'#fff',borderRadius:8,padding:'10px 12px'}}>
            <div style={{fontSize:12,fontWeight:700,color:'#334155'}}>{step.label}</div>
            <div style={{fontSize:11,color:'var(--muted)',marginTop:3}}>{step.detail}</div>
          </div>
        ))}
      </div>

      <div className="summary-strip">
        <div className="stat-card"><div className={`num ${pending.length > 0 ? 'danger' : ''}`} style={{fontSize:20}}>{pending.length}</div><div className="lbl">Pending discrepancies</div></div>
        <div className="stat-card"><div className="num success" style={{fontSize:20}}>{resolved.length}</div><div className="lbl">Resolved this review</div></div>
        <div className="stat-card"><div className={`num ${allResolved ? 'success' : 'warning'}`} style={{fontSize:20}}>{allResolved ? 'OK' : 'Review'}</div><div className="lbl">{allResolved ? 'Ready for payroll' : 'Needs check'}</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{clientData.length}</div><div className="lbl">Client records loaded</div></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:16}}>
        <div className="panel">
          <div className="panel-header"><div><h2>Select timesheet</h2></div></div>
          {loading ? <div style={{fontSize:13,color:'var(--hint)',padding:12}}>Loading timesheets...</div> : headers.length === 0 ? <div style={{fontSize:13,color:'var(--hint)',padding:12}}>No timesheet headers found.</div> : headers.map(h => (
            <div key={h.id} style={{padding:'10px 12px',borderRadius:6,cursor:'pointer',marginBottom:4,background:selectedHeader?.id===h.id?'#eff6ff':'transparent',border:selectedHeader?.id===h.id?'1px solid #bfdbfe':'1px solid transparent'}} onClick={() => handleSelectHeader(h)}>
              <div style={{fontSize:13,fontWeight:600}}>{h.client_name || 'Unknown client'}</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>{h.month_label || `${h.month}/${h.year}`} - {h.status || 'draft'}</div>
            </div>
          ))}
        </div>

        <div>
          {!selectedHeader ? (
            <div className="panel"><div className="empty-state"><h3>Select a timesheet to reconcile</h3><p>Choose a real timesheet header from the left panel.</p></div></div>
          ) : (
            <>
              <div className="panel" style={{marginBottom:16}}>
                <div className="panel-header">
                  <div><h2>Upload client timesheet</h2><p>{selectedHeader.client_name || 'Unknown client'} - {selectedHeader.month_label || `${selectedHeader.month}/${selectedHeader.year}`}</p></div>
                  <a className="btn btn-secondary btn-sm" href={`/timesheets/grid?month=${selectedHeader.month}&year=${selectedHeader.year}&client=${selectedHeader.client_id || ''}`}>Open master grid</a>
                </div>
                <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
                  <label style={{display:'inline-block',padding:'8px 16px',background:'var(--teal)',color:'white',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:600}}>
                    Upload Client XLSX
                    <input type="file" accept=".xlsx,.xlsb,.xls,.csv" style={{display:'none'}} onChange={handleFileUpload} />
                  </label>
                  {clientData.length > 0 && <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:6,padding:'8px 14px',fontSize:12,fontWeight:500,color:'#166534'}}>{clientData.length} workers loaded</div>}
                  {clientData.length > 0 && <button className="btn btn-primary" onClick={handleCompare} disabled={comparing}>{comparing ? 'Comparing...' : 'Run Comparison'}</button>}
                  {(clientData.length > 0 || discrepancies.length > 0) && <button className="btn btn-secondary" onClick={handleClearReview}>Clear review</button>}
                </div>
                {uploadError && <div style={{color:'var(--danger)',fontSize:12,marginTop:8}}>{uploadError}</div>}
                {savedReview?.saved_at && <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>Review saved in this browser at {new Date(savedReview.saved_at).toLocaleString()}.</div>}
              </div>

              {discrepancies.length > 0 && (
                <div className="panel">
                  <div className="panel-header">
                    <div><h2>Discrepancies</h2><p>{pending.length} pending - {resolved.length} resolved</p></div>
                    <div style={{display:'flex',gap:6}}>{['all','pending','resolved'].map(f => (<button key={f} className={`btn btn-sm ${filter===f?'btn-teal':'btn-secondary'}`} onClick={() => setFilter(f)}>{f}</button>))}</div>
                  </div>
                  {allResolved && <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:6,padding:'10px 14px',marginBottom:12,fontSize:13,fontWeight:500,color:'#166534'}}>All visible discrepancies resolved for this review.</div>}
                  {pending.length > 0 && <div style={{background:'#fff7ed',border:'1px solid #fdba74',borderRadius:6,padding:'10px 14px',marginBottom:12,fontSize:13,fontWeight:500,color:'#9a3412'}}>Payroll should not be treated as final until these differences are resolved.</div>}
                  <div className="table-wrap"><table>
                    <thead><tr><th>Worker</th><th>IWS hours</th><th>Client hours</th><th>Difference</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {filtered.map(d => (
                        <tr key={d.id} style={{background: d.status==='pending' ? (Math.abs(d.difference)>4?'#fff8f8':'#fffcf0') : '#f0fdf4'}}>
                          <td><div style={{fontWeight:600,fontSize:13}}>{d.iws_worker_name}{!d.matched && <span style={{marginLeft:6,fontSize:9,fontWeight:700,color:'#dc2626',background:'#fee2e2',padding:'1px 5px',borderRadius:8}}>UNMATCHED</span>}</div><div style={{fontSize:11,color:'var(--muted)'}}>Client: {d.client_name}</div></td>
                          <td style={{fontSize:13,fontWeight:500}}>{d.iws_hours}h</td>
                          <td style={{fontSize:13,fontWeight:500}}>{d.client_hours}h</td>
                          <td style={{fontSize:13,fontWeight:700,color:d.difference>0?'#16a34a':d.difference<0?'#dc2626':'#64748b'}}>{d.difference>0?'+':''}{d.difference}h</td>
                          <td><StatusBadge label={d.status} tone={d.status==='pending'?'warning':'success'} /></td>
                          <td>{d.status==='pending' ? (
                            <div style={{display:'flex',gap:4}}><button className="btn btn-teal btn-sm" onClick={() => handleResolve(d.id, 'Use IWS hours')}>Use IWS</button><button className="btn btn-secondary btn-sm" onClick={() => handleResolve(d.id, 'Use client hours')}>Use Client</button></div>
                          ) : <div style={{fontSize:11,color:'var(--muted)'}}>{d.resolution}</div>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}
