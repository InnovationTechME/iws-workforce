'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { supabase } from '../../lib/supabaseClient'
import { getVisibleWorkers } from '../../lib/workerService'
import { downloadStandardTimesheetTemplate, matchWorkerToIWS, parseClientTimesheet } from '../../lib/excelParser'
import { clearReconciliationReview, loadReconciliationReview, saveReconciliationReview } from '../../lib/timesheetReconciliationService'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function withTimeout(promise, label, timeoutMs = 9000) {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}

function TimesheetReconcileContent() {
  const searchParams = useSearchParams()
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
  const [sourceFileName, setSourceFileName] = useState(null)
  const [loading, setLoading] = useState(true)
  const [comparisonRun, setComparisonRun] = useState(false)
  const [headerSearch, setHeaderSearch] = useState('')
  const [headerStatusFilter, setHeaderStatusFilter] = useState('all')
  const [headerPeriodFilter, setHeaderPeriodFilter] = useState('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [{ data: headerRows, error }, workerRows] = await Promise.all([
          withTimeout(
            supabase
              .from('timesheet_headers')
              .select('id, client_id, client_name, month, year, month_label, status')
              .order('year', { ascending: false })
              .order('month', { ascending: false }),
            'timesheet headers'
          ),
          withTimeout(getVisibleWorkers(), 'workers'),
        ])
        const rows = headerRows || []
        if (!error) {
          setHeaders(rows)
          const queryMonth = Number(searchParams.get('month')) || null
          const queryYear = Number(searchParams.get('year')) || null
          const queryClient = searchParams.get('client') || ''
          const requestedHeader = rows.find(row =>
            (!queryMonth || row.month === queryMonth) &&
            (!queryYear || row.year === queryYear) &&
            (!queryClient || row.client_id === queryClient)
          )
          if (requestedHeader) {
            await handleSelectHeader(requestedHeader)
          }
        } else setUploadError(error.message)
        setWorkers(workerRows || [])
      } catch (err) {
        setUploadError(err.message || 'Timesheet reconciliation data did not load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [searchParams])

  async function handleSelectHeader(header) {
    setSelectedHeader(header)
    setClientData([])
    setDiscrepancies([])
    setSavedReview(null)
    setSourceFileName(null)
    setComparisonRun(false)
    setUploadError(null)
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('timesheet_lines')
          .select('id, worker_id, total_hours, worker:workers(full_name, worker_number)')
          .eq('header_id', header.id),
        'timesheet lines'
      )
      if (error) {
        setIwsLines([])
        setUploadError(error.message)
        return
      }
      setIwsLines(data || [])
      const existingReview = await withTimeout(loadReconciliationReview(header.id), 'saved reconciliation review')
      if (existingReview) {
        setClientData(existingReview.clientData || [])
        setDiscrepancies(existingReview.discrepancies || [])
        setSavedReview(existingReview)
        setSourceFileName(existingReview.source_file_name || null)
        setComparisonRun((existingReview.discrepancies || []).length > 0)
      }
    } catch (err) {
      setIwsLines([])
      setUploadError(err.message || 'Selected timesheet did not load')
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadError(null)
    try {
      const parsed = await parseClientTimesheet(file)
      const rows = (parsed.workers || []).map(worker => ({
        client_id: worker.client_worker_id || '',
        name: worker.worker_name,
        trade: worker.trade,
        total_hours: Math.round(Number(worker.total_hours || 0) * 100) / 100,
        daily_hours: worker.daily_hours || [],
      }))
      setClientData(rows)
      setDiscrepancies([])
      setSavedReview(null)
      setSourceFileName(file.name)
      setComparisonRun(false)
    } catch (err) {
      setUploadError('Error reading file: ' + err.message)
    }
    e.target.value = ''
  }

  async function handleDownloadTemplate() {
    if (!selectedHeader) return
    const uniqueWorkers = []
    const seen = new Set()
    iwsLines.forEach(line => {
      const worker = line.worker || {}
      const key = line.worker_id || worker.worker_number || worker.full_name
      if (!key || seen.has(key)) return
      seen.add(key)
      uniqueWorkers.push({
        worker_number: worker.worker_number || '',
        full_name: worker.full_name || '',
        role: '',
      })
    })
    await downloadStandardTimesheetTemplate({
      month: selectedHeader.month,
      year: selectedHeader.year,
      monthName: MONTH_NAMES[selectedHeader.month - 1],
      clientName: selectedHeader.client_name || 'Client site',
      workers: uniqueWorkers,
      daysCount: new Date(selectedHeader.year, selectedHeader.month, 0).getDate(),
      filePrefix: `IWS-${selectedHeader.client_name || 'timesheet'}`,
    })
  }

  async function handleCompare() {
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
      const iwsWorker = matchWorkerToIWS(cw.name, workers, cw.client_id)?.worker || null
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
    try {
      setDiscrepancies(next)
      setComparisonRun(true)
      const saved = await saveReconciliationReview(selectedHeader.id, {
        header: selectedHeader,
        clientData,
        discrepancies: next,
        source: 'client_upload_compare',
        fileName: sourceFileName,
      })
      setSavedReview(saved)
    } catch (err) {
      setUploadError(err.message || 'Comparison could not be saved')
    } finally {
      setComparing(false)
    }
  }

  async function handleResolve(discId, resolution) {
    const next = discrepancies.map(d => d.id === discId
      ? { ...d, status: 'resolved', resolution, resolved_at: new Date().toISOString() }
      : d
    )
    setDiscrepancies(next)
    if (selectedHeader) {
      const saved = await saveReconciliationReview(selectedHeader.id, {
        header: selectedHeader,
        clientData,
        discrepancies: next,
        source: 'client_upload_compare',
        fileName: sourceFileName,
      })
      setSavedReview(saved)
    }
  }

  async function handleIgnore(discId) {
    const next = discrepancies.map(d => d.id === discId
      ? { ...d, status: 'ignored', resolution: 'Ignored after review', resolved_at: new Date().toISOString() }
      : d
    )
    setDiscrepancies(next)
    if (selectedHeader) {
      const saved = await saveReconciliationReview(selectedHeader.id, {
        header: selectedHeader,
        clientData,
        discrepancies: next,
        source: 'client_upload_compare',
        fileName: sourceFileName,
      })
      setSavedReview(saved)
    }
  }

  async function handleClearReview() {
    if (!selectedHeader) return
    await clearReconciliationReview(selectedHeader.id)
    setClientData([])
    setDiscrepancies([])
    setSavedReview(null)
    setSourceFileName(null)
    setComparisonRun(false)
  }

  const pending = discrepancies.filter(d => d.status === 'pending')
  const resolved = discrepancies.filter(d => d.status === 'resolved')
  const ignored = discrepancies.filter(d => d.status === 'ignored')
  const filtered = filter === 'pending' ? pending : filter === 'resolved' ? resolved : filter === 'ignored' ? ignored : discrepancies
  const allResolved = pending.length === 0 && discrepancies.length > 0
  const cleanComparison = comparisonRun && discrepancies.length === 0 && clientData.length > 0
  const totalDifference = discrepancies.reduce((sum, d) => sum + Math.abs(Number(d.difference || 0)), 0)
  const unmatchedCount = discrepancies.filter(d => !d.matched).length
  const selectedPeriodLabel = selectedHeader
    ? selectedHeader.month_label || `${selectedHeader.month}/${selectedHeader.year}`
    : 'No month selected'

  const storageLabel = savedReview?.storage === 'database'
    ? 'Saved to Supabase discrepancies table'
    : savedReview?.storage === 'browser'
      ? 'Saved in this browser only'
      : null

  const periodOptions = useMemo(() => {
    const seen = new Set()
    return headers
      .map(h => ({ value: `${h.month}-${h.year}`, label: h.month_label || `${h.month}/${h.year}`, month: h.month, year: h.year }))
      .filter(item => {
        if (seen.has(item.value)) return false
        seen.add(item.value)
        return true
      })
  }, [headers])

  const filteredHeaders = useMemo(() => {
    const search = headerSearch.trim().toLowerCase()
    return headers.filter(header => {
      const periodKey = `${header.month}-${header.year}`
      const matchesSearch = !search || [header.client_name, header.month_label, header.status].some(value => String(value || '').toLowerCase().includes(search))
      const matchesStatus = headerStatusFilter === 'all' || header.status === headerStatusFilter
      const matchesPeriod = headerPeriodFilter === 'all' || periodKey === headerPeriodFilter
      return matchesSearch && matchesStatus && matchesPeriod
    })
  }, [headers, headerPeriodFilter, headerSearch, headerStatusFilter])


  return (
    <AppShell pageTitle="Timesheet Reconciliation">
      <PageHeader eyebrow="Timesheet Reconciliation" title="Client timesheet comparison" description="Upload a client timesheet, compare it against IWS lines, and resolve visible differences before payroll runs." />

      <div className="panel" style={{background:'#f8fafc',padding:14}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10}}>
          {[
            { title: '1 Master timesheet', text: 'Enter or edit IWS hours in the grid.', href: selectedHeader ? `/timesheets/grid?month=${selectedHeader.month}&year=${selectedHeader.year}&client=${selectedHeader.client_id || ''}` : '/timesheets/grid', action: 'Open grid' },
            { title: '2 Client upload', text: 'Upload XLSX/CSV from client or supplier.', href: null, action: clientData.length ? `${clientData.length} rows loaded` : 'Awaiting file' },
            { title: '3 Resolve conflicts', text: pending.length ? `${pending.length} pending differences block payroll.` : cleanComparison || allResolved ? 'No pending conflicts.' : 'Run comparison.', href: null, action: pending.length ? 'Needs review' : 'OK' },
            { title: '4 Payroll run', text: 'Payroll exports unlock after review.', href: '/payroll-run', action: 'Open payroll' },
          ].map(item => (
            <div key={item.title} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:8,padding:12,minHeight:94}}>
              <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:4}}>{item.title}</div>
              <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.4,minHeight:34}}>{item.text}</div>
              {item.href ? <Link className="btn btn-secondary btn-sm" href={item.href} style={{marginTop:8}}>{item.action}</Link> : <div style={{fontSize:11,fontWeight:700,color:'var(--teal)',marginTop:10}}>{item.action}</div>}
            </div>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,marginBottom:16}}>
        {[
          { label: '1 Select month', detail: selectedPeriodLabel },
          { label: '2 Upload client file', detail: clientData.length ? `${clientData.length} workers loaded` : 'Awaiting XLSX/CSV' },
          { label: '3 Compare and resolve', detail: discrepancies.length ? `${pending.length} pending` : 'No comparison yet' },
          { label: '4 Return to payroll', detail: allResolved || cleanComparison ? 'Ready for payroll check' : 'Finish review first' },
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
        <div className="stat-card"><div className={`num ${allResolved || cleanComparison ? 'success' : 'warning'}`} style={{fontSize:20}}>{allResolved || cleanComparison ? 'OK' : 'Review'}</div><div className="lbl">{allResolved || cleanComparison ? 'Ready for payroll' : 'Needs check'}</div></div>
        <div className="stat-card"><div className={`num ${unmatchedCount > 0 ? 'danger' : ''}`} style={{fontSize:20}}>{unmatchedCount || Math.round(totalDifference * 10) / 10}</div><div className="lbl">{unmatchedCount ? 'Unmatched workers' : 'Hours difference'}</div></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:16}}>
        <div className="panel">
          <div className="panel-header"><div><h2>Select timesheet</h2><p>{filteredHeaders.length} of {headers.length} shown</p></div></div>
          <div style={{display:'grid',gap:8,marginBottom:10}}>
            <input value={headerSearch} onChange={e => setHeaderSearch(e.target.value)} placeholder="Search client or month..." style={{width:'100%',border:'1px solid var(--border)',borderRadius:6,padding:'8px 10px',fontSize:12}} />
            <select value={headerPeriodFilter} onChange={e => setHeaderPeriodFilter(e.target.value)} style={{border:'1px solid var(--border)',borderRadius:6,padding:'7px 8px',fontSize:12}}>
              <option value="all">All periods</option>
              {periodOptions.map(period => <option key={period.value} value={period.value}>{period.label}</option>)}
            </select>
            <select value={headerStatusFilter} onChange={e => setHeaderStatusFilter(e.target.value)} style={{border:'1px solid var(--border)',borderRadius:6,padding:'7px 8px',fontSize:12}}>
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="hr_approved">HR approved</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
            </select>
          </div>
          {loading ? <div style={{fontSize:13,color:'var(--hint)',padding:12}}>Loading timesheets...</div> : headers.length === 0 ? <div style={{fontSize:13,color:'var(--hint)',padding:12}}>No timesheet headers found.</div> : filteredHeaders.length === 0 ? <div style={{fontSize:13,color:'var(--hint)',padding:12}}>No timesheets match the filters.</div> : filteredHeaders.map(h => (
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
                  <Link className="btn btn-secondary btn-sm" href={`/timesheets/grid?month=${selectedHeader.month}&year=${selectedHeader.year}&client=${selectedHeader.client_id || ''}`}>Open master grid</Link>
                </div>
                <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
                  <label style={{display:'inline-block',padding:'8px 16px',background:'var(--teal)',color:'white',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:600}}>
                    Upload Client XLSX
                    <input type="file" accept=".xlsx,.xlsb,.xls,.csv" style={{display:'none'}} onChange={handleFileUpload} />
                  </label>
                  <button className="btn btn-secondary" onClick={handleDownloadTemplate}>Download Template</button>
                  {clientData.length > 0 && <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:6,padding:'8px 14px',fontSize:12,fontWeight:500,color:'#166534'}}>{clientData.length} workers loaded</div>}
                  {clientData.length > 0 && <button className="btn btn-primary" onClick={handleCompare} disabled={comparing}>{comparing ? 'Comparing...' : 'Run Comparison'}</button>}
                  {(clientData.length > 0 || discrepancies.length > 0) && <button className="btn btn-secondary" onClick={handleClearReview}>Clear review</button>}
                </div>
                <div style={{background:'#f8fafc',border:'1px solid var(--border)',borderRadius:6,padding:'10px 12px',fontSize:12,color:'var(--muted)',marginTop:12}}>
                  Reconciliation compares monthly totals. If the client total is correct, update daily hours in the Master Timesheet first, then rerun this comparison.
                  {sourceFileName && <div style={{marginTop:4}}>Loaded file: <strong>{sourceFileName}</strong></div>}
                </div>
                {uploadError && <div style={{color:'var(--danger)',fontSize:12,marginTop:8}}>{uploadError}</div>}
                {savedReview?.saved_at && <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>{storageLabel || 'Review saved'} at {new Date(savedReview.saved_at).toLocaleString()}.</div>}
              </div>

              {discrepancies.length > 0 && (
                <div className="panel">
                  <div className="panel-header">
                    <div><h2>Discrepancies</h2><p>{pending.length} pending - {resolved.length} resolved - {ignored.length} ignored</p></div>
                    <div style={{display:'flex',gap:6}}>{['all','pending','resolved','ignored'].map(f => (<button key={f} className={`btn btn-sm ${filter===f?'btn-teal':'btn-secondary'}`} onClick={() => setFilter(f)}>{f}</button>))}</div>
                  </div>
                  {allResolved && <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:6,padding:'10px 14px',marginBottom:12,fontSize:13,fontWeight:500,color:'#166534'}}>All visible discrepancies resolved for this review.</div>}
                  {pending.length > 0 && <div style={{background:'#fff7ed',border:'1px solid #fdba74',borderRadius:6,padding:'10px 14px',marginBottom:12,fontSize:13,fontWeight:500,color:'#9a3412'}}>Payroll is blocked until these differences are either accepted after review or corrected in the Master Timesheet.</div>}
                  <div className="table-wrap"><table>
                    <thead><tr><th>Worker</th><th>IWS hours</th><th>Client hours</th><th>Difference</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {filtered.map(d => (
                        <tr key={d.id} style={{background: d.status==='pending' ? (Math.abs(d.difference)>4?'#fff8f8':'#fffcf0') : d.status === 'ignored' ? '#f8fafc' : '#f0fdf4'}}>
                          <td><div style={{fontWeight:600,fontSize:13}}>{d.iws_worker_name}{!d.matched && <span style={{marginLeft:6,fontSize:9,fontWeight:700,color:'#dc2626',background:'#fee2e2',padding:'1px 5px',borderRadius:8}}>UNMATCHED</span>}</div><div style={{fontSize:11,color:'var(--muted)'}}>Client: {d.client_name}</div></td>
                          <td style={{fontSize:13,fontWeight:500}}>{d.iws_hours}h</td>
                          <td style={{fontSize:13,fontWeight:500}}>{d.client_hours}h</td>
                          <td style={{fontSize:13,fontWeight:700,color:d.difference>0?'#16a34a':d.difference<0?'#dc2626':'#64748b'}}>{d.difference>0?'+':''}{d.difference}h</td>
                          <td><StatusBadge label={d.status} tone={d.status==='pending'?'warning':d.status==='ignored'?'neutral':'success'} /></td>
                          <td>{d.status==='pending' ? (
                            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}><button className="btn btn-teal btn-sm" onClick={() => handleResolve(d.id, 'Accepted IWS master hours')}>Accept IWS</button><Link className="btn btn-secondary btn-sm" href={`/timesheets/grid?month=${selectedHeader.month}&year=${selectedHeader.year}&client=${selectedHeader.client_id || ''}`}>Edit grid</Link><button className="btn btn-secondary btn-sm" onClick={() => handleResolve(d.id, 'Accepted client total after manual review')}>Accept client</button><button className="btn btn-secondary btn-sm" onClick={() => handleIgnore(d.id)}>Ignore</button></div>
                          ) : <div style={{fontSize:11,color:'var(--muted)'}}>{d.resolution}</div>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                </div>
              )}
              {cleanComparison && (
                <div className="panel">
                  <div className="empty-state" style={{padding:'28px 20px'}}>
                    <h3>No differences found</h3>
                    <p>The uploaded client file matches the IWS master totals within the 0.5 hour tolerance. Payroll can continue for this period.</p>
                    <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:14,flexWrap:'wrap'}}>
                      <Link className="btn btn-secondary" href={`/timesheets/grid?month=${selectedHeader.month}&year=${selectedHeader.year}&client=${selectedHeader.client_id || ''}`}>Review master grid</Link>
                      <Link className="btn btn-primary" href="/payroll-run">Go to payroll run</Link>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}

export default function TimesheetReconcilePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading reconciliation...</div>}>
      <TimesheetReconcileContent />
    </Suspense>
  )
}
