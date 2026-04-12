'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getPackCoverage, getDocuments, getVisibleWorkers, getCertifications, getWorker, getDocumentsByWorker } from '../../lib/mockStore'
import { formatDate, getStatusTone } from '../../lib/utils'
import { PACK_DOCUMENT_TYPES } from '../../data/constants'

// Standard documents always auto-included in a pack (cover page is generated, not stored)
const STANDARD_PACK_DOCS = [
  { key:'passport', label:'Passport Copy' },
  { key:'photo', label:'Passport Photo' },
  { key:'uae_visa', label:'UAE Visa' },
  { key:'emirates_id', label:'Emirates ID' },
  { key:'workers_compensation', label:"Workmen's Compensation \u2014 Name Highlighted" },
]

function ddmmyyyy(d) {
  const dt = d instanceof Date ? d : new Date()
  const dd = String(dt.getDate()).padStart(2,'0')
  const mm = String(dt.getMonth() + 1).padStart(2,'0')
  const yy = dt.getFullYear()
  return `${dd}${mm}${yy}`
}

function assessPackReadiness(worker, docs) {
  const issues = []
  const today = new Date()
  today.setHours(0,0,0,0)
  for (const std of STANDARD_PACK_DOCS) {
    const d = docs.find(x => x.document_type === std.key)
    if (!d || d.status === 'missing' || !d.file_name) {
      issues.push({ type: 'missing', label: std.label, key: std.key, fix: `Upload ${std.label} in the worker's Documents tab` })
    }
  }
  const wc = docs.find(x => x.document_type === 'workers_compensation')
  if (wc) {
    if (!wc.expiry_date) {
      issues.push({ type: 'wc_expiry_missing', label: 'WC expiry date', key: 'workers_compensation', fix: 'Set WC expiry date in the Documents tab' })
    } else if (new Date(wc.expiry_date) < today) {
      issues.push({ type: 'wc_expired', label: `WC expired on ${wc.expiry_date}`, key: 'workers_compensation', fix: 'Upload renewed WC certificate' })
    }
    if (wc.highlighted_name_confirmed !== true) {
      issues.push({ type: 'wc_highlight', label: 'WC name-highlight not confirmed', key: 'workers_compensation', fix: 'Re-upload WC with the worker\u2019s name highlighted and tick the confirmation checkbox' })
    }
  }
  return { ready: issues.length === 0, issues }
}

export default function PacksPage() {
  const [coverage, setCoverage] = useState([])
  const [filter, setFilter] = useState('all')
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [workerDocs, setWorkerDocs] = useState([])
  const [workerCerts, setWorkerCerts] = useState([])
  const [selectedDocIds, setSelectedDocIds] = useState([])
  const [building, setBuilding] = useState(false)
  const [showCoverPreview, setShowCoverPreview] = useState(false)

  useEffect(() => { setCoverage(getPackCoverage()) }, [])

  const openPackBuilder = (workerId) => {
    const worker = getWorker(workerId)
    const allDocs = getDocumentsByWorker(workerId)
    const certs = getCertifications().filter(c => c.worker_id === workerId)
    setSelectedWorker(worker)
    setWorkerDocs(allDocs)
    setWorkerCerts(certs)
    setSelectedDocIds([])
  }

  const toggleDoc = (id) => {
    setSelectedDocIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id])
  }

  const handleBuildZip = async () => {
    setBuilding(true)
    try {
      const JSZip = (await import('jszip')).default
      const { workerCoverPageHTML } = await import('../../lib/coverPageTemplate')
      const zip = new JSZip()
      const safeName = selectedWorker.full_name.replace(/\s+/g,'_')
      const datePart = ddmmyyyy(new Date())
      const folderName = `${selectedWorker.worker_number}_${safeName}_DocumentPack_${datePart}`
      const folder = zip.folder(folderName)

      // Cover page always first
      const coverHtml = workerCoverPageHTML(selectedWorker, selectedWorker.experiences || [])
      folder.file(`00_${selectedWorker.worker_number}_CoverPage.html`, coverHtml)

      // Auto-include the 5 standard documents (status != 'missing')
      const autoIncluded = []
      STANDARD_PACK_DOCS.forEach((std, idx) => {
        const d = workerDocs.find(x => x.document_type === std.key)
        if (d && d.status !== 'missing') {
          const fileName = d.file_name || `${selectedWorker.worker_number}_${safeName}_${std.key}.pdf`
          const mockContent = `[MOCK FILE - DOCUMENT]\n\nWorker: ${selectedWorker.full_name}\nID: ${selectedWorker.worker_number}\nDocument: ${std.label}\nFile: ${fileName}\nGenerated: ${new Date().toISOString()}`
          folder.file(`${String(idx+1).padStart(2,'0')}_${fileName}`, mockContent)
          autoIncluded.push({ name: fileName, label: std.label })
        }
      })

      // Any additional certs the user ticked
      const optionalItems = workerCerts
        .filter(c => selectedDocIds.includes(c.id))
        .map(c => ({ id:c.id, name: c.file_name || `${selectedWorker.worker_number}_${safeName}_${c.certification_type.replace(/\s+/g,'_')}.pdf`, item: c }))

      optionalItems.forEach((item, i) => {
        const mockContent = `[MOCK FILE - CERTIFICATION]\n\nWorker: ${selectedWorker.full_name}\nID: ${selectedWorker.worker_number}\nCertification: ${item.item.certification_type}\nGenerated: ${new Date().toISOString()}`
        folder.file(`${String(autoIncluded.length + i + 1).padStart(2,'0')}_${item.name}`, mockContent)
      })

      const manifest = `WORKER DOCUMENT PACK MANIFEST\n${'='.repeat(40)}\nWorker: ${selectedWorker.full_name}\nID: ${selectedWorker.worker_number}\nGenerated: ${new Date().toLocaleString()}\nBy: Innovation Technologies LLC O.P.C.\n\nSTANDARD DOCUMENTS (auto-included):\n00. Cover Page (auto-generated HTML)\n${autoIncluded.map((a,i)=>`${String(i+1).padStart(2,'0')}. ${a.label} \u2014 ${a.name}`).join('\n')}\n\nADDITIONAL CERTIFICATIONS:\n${optionalItems.length ? optionalItems.map((o,i)=>`${String(autoIncluded.length+i+1).padStart(2,'0')}. ${o.item.certification_type} \u2014 ${o.name}`).join('\n') : '(none selected)'}\n`
      folder.file('_PACK_MANIFEST.txt', manifest)

      const blob = await zip.generateAsync({type:'blob'})
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${folderName}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch(e) {
      console.error('ZIP error:', e)
    }
    setBuilding(false)
  }

  const sorted = [...coverage].sort((a,b) => {
    const aWorker = getWorker(a.worker_id)
    const bWorker = getWorker(b.worker_id)
    const aActive = aWorker?.active !== false ? 0 : 1
    const bActive = bWorker?.active !== false ? 0 : 1
    return aActive - bActive
  })
  const filtered = filter==='all' ? sorted : filter==='ready' ? sorted.filter(p=>p.available_count===p.required_count) : sorted.filter(p=>p.available_count<p.required_count)
  const ready = coverage.filter(p=>p.available_count===p.required_count).length
  const blocked = coverage.filter(p=>p.available_count<p.required_count).length
  const totalMissing = coverage.reduce((s,p)=>s+(p.required_count-p.available_count),0)

  return (
    <AppShell pageTitle="Packs">
      <PageHeader eyebrow="Document Packs" title="Document pack builder" description="Select documents for each worker and download as a ZIP pack for client submission." />
      <div className="summary-strip">
        <div className="stat-card"><div className="num success" style={{fontSize:20}}>{ready}</div><div className="lbl">Pack ready</div></div>
        <div className="stat-card"><div className="num danger" style={{fontSize:20}}>{blocked}</div><div className="lbl">Blocked</div></div>
        <div className="stat-card"><div className="num warning" style={{fontSize:20}}>{totalMissing}</div><div className="lbl">Missing items</div></div>
        <div className="stat-card"><div className="num" style={{fontSize:20}}>{coverage.length}</div><div className="lbl">Workers assessed</div></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns: selectedWorker ? '1fr 380px' : '1fr',gap:16}}>
        <div className="panel">
          <div className="toolbar">
            {[['all','All'],['ready','Ready'],['blocked','Blocked']].map(([key,label])=>(
              <button key={key} className={`btn btn-sm ${filter===key?'btn-teal':'btn-secondary'}`} onClick={()=>setFilter(key)}>{label}</button>
            ))}
          </div>
          <div style={{background:'#f1f5f9',border:'1px solid #cbd5e1',borderRadius:6,padding:'8px 12px',marginBottom:10,fontSize:12,color:'#475569'}}>Inactive workers are shown for record purposes. Reactivation requires Operations + Owner approval.</div>
          <div className="table-wrap"><table>
            <thead><tr><th>Worker</th><th>Category</th><th>Status</th><th>Coverage</th><th>Missing</th><th>Build Pack</th></tr></thead>
            <tbody>
              {filtered.map(p=>{ const isInactive = getWorker(p.worker_id)?.active === false; return (
                <tr key={p.worker_id} style={{background:selectedWorker?.id===p.worker_id?'#eff6ff':'',opacity:isInactive?0.6:1}}>
                  <td style={{fontWeight:500}}>{p.worker_name}<div style={{fontSize:11,color:'var(--hint)'}}>{p.worker_number}</div></td>
                  <td><StatusBadge label={p.category} tone="neutral" /></td>
                  <td>{isInactive ? <StatusBadge label="Inactive" tone="neutral" /> : <StatusBadge label={p.available_count===p.required_count?'Ready':'Blocked'} tone={p.available_count===p.required_count?'success':'danger'} />}</td>
                  <td><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{flex:1,height:4,background:'var(--border)',borderRadius:2}}><div style={{width:`${Math.min((p.available_count/p.required_count)*100,100)}%`,height:'100%',background:p.available_count===p.required_count?'var(--success)':'var(--warning)',borderRadius:2}}/></div><span style={{fontSize:11,color:'var(--muted)',whiteSpace:'nowrap'}}>{p.available_count}/{p.required_count}</span></div></td>
                  <td style={{fontSize:12,color:'var(--danger)'}}>{p.missing_types?.join(', ')||'—'}</td>
                  <td><button className="btn btn-teal btn-sm" onClick={()=>openPackBuilder(p.worker_id)}>📦 Select &amp; Build</button></td>
                </tr>)
              })}
            </tbody>
          </table></div>
        </div>

        {selectedWorker && (
          <div className="panel" style={{display:'flex',flexDirection:'column',maxHeight:'calc(100vh - 200px)',position:'sticky',top:16}}>
            <div className="panel-header" style={{flexShrink:0}}>
              <div><h2>📦 {selectedWorker.full_name}</h2><p>{selectedWorker.worker_number} · {selectedWorker.category}</p></div>
              <button className="btn btn-ghost btn-sm" onClick={()=>setSelectedWorker(null)}>✕</button>
            </div>

            {(() => {
              const readiness = assessPackReadiness(selectedWorker, workerDocs)
              const wc = workerDocs.find(x => x.document_type === 'workers_compensation')
              return (
                <>
                <div style={{flex:1,overflowY:'auto',minHeight:0}}>
                  {!readiness.ready && (
                    <div style={{background:'#fef2f2',border:'2px solid #fca5a5',borderRadius:8,padding:'12px 14px',marginBottom:12}}>
                      <div style={{fontSize:12,fontWeight:700,color:'#dc2626',marginBottom:6}}>⛔ Pack blocked</div>
                      <div style={{fontSize:11,color:'#991b1b',marginBottom:8}}>This worker&apos;s document pack cannot be generated. Missing or expired documents:</div>
                      {readiness.issues.map((iss, i) => (
                        <div key={i} style={{fontSize:11,color:'#991b1b',marginBottom:3}}>
                          • <strong>{iss.label}</strong> — {iss.fix}
                        </div>
                      ))}
                      <Link href={`/workers/${selectedWorker.id}`} className="btn btn-secondary btn-sm" style={{marginTop:8,fontSize:11}}>Open worker Documents →</Link>
                    </div>
                  )}

                  <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>Standard documents (always included)</div>
                  <div style={{background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:6,padding:'10px 12px',marginBottom:10}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0'}}>
                      <span style={{color:'#0d9488',fontSize:13}}>✓</span>
                      <div style={{flex:1,fontSize:12,fontWeight:500}}>Cover Page</div>
                      <button className="btn btn-ghost btn-sm" style={{fontSize:10,padding:'2px 6px'}} onClick={(e) => {e.preventDefault(); setShowCoverPreview(true)}}>👁 Preview</button>
                    </div>
                    {STANDARD_PACK_DOCS.map(std => {
                      const d = workerDocs.find(x => x.document_type === std.key)
                      const ok = d && d.status !== 'missing' && d.file_name
                      const expiry = d?.expiry_date
                      return (
                        <div key={std.key} style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0'}}>
                          <span style={{color: ok ? '#0d9488' : '#94a3b8',fontSize:13}}>{ok ? '✓' : '○'}</span>
                          <div style={{flex:1,fontSize:12}}>
                            <span style={{fontWeight: ok ? 500 : 400, color: ok ? 'var(--text)' : 'var(--hint)'}}>{std.label}</span>
                            {std.key === 'workers_compensation' && expiry && <span style={{fontSize:10,color:'var(--muted)',marginLeft:6}}>(expires {formatDate(expiry)})</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {workerCerts.length > 0 && (
                    <>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>Additional documents (optional)</div>
                      {workerCerts.map(c => (
                        <label key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid var(--border)',cursor:'pointer'}}>
                          <input type="checkbox" checked={selectedDocIds.includes(c.id)} onChange={()=>toggleDoc(c.id)} />
                          <div style={{flex:1}}>
                            <div style={{fontSize:12,fontWeight:500}}>{c.certification_type}</div>
                            <div style={{fontSize:10,color:'var(--hint)'}}>{c.file_name||'No file uploaded'}</div>
                          </div>
                          <StatusBadge label={c.status} tone={c.status==='valid'?'success':c.status==='expired'?'danger':'warning'} />
                        </label>
                      ))}
                    </>
                  )}
                </div>

                <div style={{flexShrink:0,paddingTop:12,borderTop:'1px solid var(--border)'}}>
                  <div style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>{STANDARD_PACK_DOCS.filter(s => {
                    const d = workerDocs.find(x => x.document_type === s.key)
                    return d && d.status !== 'missing'
                  }).length + 1} standard + {selectedDocIds.length} optional</div>
                  <button className="btn btn-primary" style={{width:'100%'}} disabled={!readiness.ready || building} onClick={handleBuildZip}>
                    {building ? 'Building ZIP...' : !readiness.ready ? '⛔ Pack blocked' : '⬇ Download Pack as ZIP'}
                  </button>
                </div>
                </>
              )
            })()}
          </div>
        )}
      </div>
      {showCoverPreview && selectedWorker && (() => {
        const w = getWorker(selectedWorker.id) || selectedWorker
        const wDocs = getDocumentsByWorker(w.id)
        const allCerts = getCertifications().filter(c => c.worker_id === w.id)
        const passport = wDocs.find(d => d.document_type === 'passport')
        const eid = wDocs.find(d => d.document_type === 'emirates_id')
        const visa = wDocs.find(d => d.document_type === 'visa') || wDocs.find(d => d.document_type === 'labour_card')
        const age = w.date_of_birth ? Math.floor((new Date() - new Date(w.date_of_birth)) / (365.25*24*60*60*1000)) : null
        const todayFormatted = new Date().toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'})
        const statusBadge = (s) => {
          if (!s || s === 'missing') return {bg:'#f1f5f9',color:'#64748b',label:'Not on file'}
          if (s === 'valid') return {bg:'#dcfce7',color:'#16a34a',label:'Valid'}
          if (s === 'expiring_soon') return {bg:'#fef3c7',color:'#d97706',label:'Expiring'}
          if (s === 'expired') return {bg:'#fee2e2',color:'#dc2626',label:'Expired'}
          return {bg:'#f1f5f9',color:'#64748b',label:s}
        }
        const activeCerts = allCerts.filter(c => c.status === 'valid' || c.status === 'expiring_soon')
        const certsToShow = activeCerts.slice(0, 6)
        const certsExtra = activeCerts.length - 6
        const complianceCard = (label, value, expiryDate, docStatus) => {
          const badge = statusBadge(docStatus)
          return (
            <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,padding:12}}>
              <div style={{fontSize:10,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>{label}</div>
              <div style={{fontSize:14,fontWeight:700,color:'#0f172a'}}>{value || <span style={{color:'#64748b'}}>Not on file</span>}</div>
              <div style={{display:'flex',alignItems:'center',gap:6,marginTop:6}}>
                <span style={{fontSize:10,color:'#94a3b8'}}>Expires:</span>
                <span style={{fontSize:10,fontWeight:500,color:'#475569'}}>{expiryDate ? formatDate(expiryDate) : '—'}</span>
                <span style={{fontSize:9,fontWeight:600,background:badge.bg,color:badge.color,borderRadius:10,padding:'1px 7px',marginLeft:'auto'}}>{badge.label}</span>
              </div>
            </div>
          )
        }
        return (
        <div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'flex-start',justifyContent:'center',overflowY:'auto',padding:'40px 20px'}} onClick={() => setShowCoverPreview(false)}>
          <div style={{position:'relative',maxWidth:595,width:'100%',margin:'0 auto'}} onClick={e => e.stopPropagation()}>
            <div style={{position:'absolute',top:-36,right:0,display:'flex',gap:8}}>
              <button className="btn btn-sm" style={{background:'white',color:'#334155',fontWeight:600}} onClick={() => {
                const el = document.getElementById('cover-page-print')
                const win = window.open('','','width=700,height=900')
                win.document.write('<html><head><title>Cover Page</title></head><body style="margin:0">'+el.outerHTML+'</body></html>')
                win.document.close()
                win.focus()
                win.print()
              }}>🖨 Print / Save PDF</button>
              <button className="btn btn-ghost btn-sm" style={{color:'white',fontSize:18}} onClick={() => setShowCoverPreview(false)}>✕</button>
            </div>
            <div id="cover-page-print" style={{background:'#fff',borderRadius:4,overflow:'hidden',fontFamily:'Arial, sans-serif',boxShadow:'0 8px 32px rgba(0,0,0,0.3)'}}>
              {/* Header */}
              <div style={{background:'#0f172a',padding:'20px 24px',display:'flex',alignItems:'center'}}>
                <div style={{width:44,height:44,borderRadius:'50%',background:'#1e3a8a',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:800,fontSize:17,flexShrink:0}}>iN</div>
                <div style={{flex:1,textAlign:'center'}}>
                  <div style={{color:'white',fontSize:18,fontWeight:700}}>Innovation Technologies LLC</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{color:'#e2e8f0',fontSize:10}}>Licence: CN-5087790 | MOHRE: 1979124</div>
                  <div style={{color:'#e2e8f0',fontSize:10}}>www.innovationtech.me | +971 2 333 6633</div>
                </div>
              </div>
              {/* Hero */}
              <div style={{background:'#fff',padding:'28px 24px',borderBottom:'1px solid #e2e8f0',display:'flex',gap:20}}>
                <div style={{flex:'0 0 60%'}}>
                  <div style={{fontSize:26,fontWeight:700,color:'#0f172a',lineHeight:1.2}}>{w.full_name}</div>
                  <div style={{fontSize:13,fontFamily:'monospace',color:'#1e3a8a',marginTop:4}}>{w.worker_number}</div>
                  <div style={{marginTop:12}}>
                    <span style={{display:'inline-block',fontSize:15,fontWeight:600,background:'#1e3a8a',color:'#fff',borderRadius:20,padding:'8px 20px'}}>{w.trade_role || 'Unassigned'}</span>
                  </div>
                  <div style={{fontSize:13,color:'#64748b',marginTop:10}}>
                    {w.nationality || '—'}{age ? ` · ${age} years` : ''}
                  </div>
                </div>
                <div style={{flex:'0 0 40%',display:'flex',justifyContent:'flex-end'}}>
                  <div style={{width:80,height:100,background:'#f1f5f9',border:'2px solid #e2e8f0',borderRadius:6,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                    <div style={{fontSize:24}}>📷</div>
                    <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>Photo</div>
                  </div>
                </div>
              </div>
              {/* ID & Compliance */}
              <div style={{background:'#f8fafc',padding:'20px 24px'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#1e3a8a',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Identification & Compliance</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  {complianceCard('Passport No.', w.passport_number, w.passport_expiry, passport?.status)}
                  {complianceCard('Emirates ID', w.emirates_id, w.emirates_id_expiry, eid?.status)}
                  {complianceCard('Visa / Permit', w.visa_number, visa?.expiry_date, visa?.status)}
                  <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,padding:12}}>
                    <div style={{fontSize:10,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>IWS Reference</div>
                    <div style={{fontSize:14,fontWeight:700,color:'#1e3a8a'}}>{w.worker_number}</div>
                    <div style={{fontSize:10,color:'#64748b',marginTop:6}}>Innovation Technologies LLC</div>
                  </div>
                </div>
              </div>
              {/* Certifications */}
              <div style={{background:'#fff',padding:'20px 24px'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#1e3a8a',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Active Certifications</div>
                {activeCerts.length === 0 ? (
                  <div style={{fontSize:12,color:'#94a3b8',fontStyle:'italic'}}>No certifications on file</div>
                ) : (
                  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                    {certsToShow.map((c,i) => {
                      const b = statusBadge(c.status)
                      return (
                        <div key={i} style={{display:'inline-flex',alignItems:'center',gap:6,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:20,padding:'5px 12px',fontSize:11}}>
                          <span style={{fontWeight:600,color:'#334155'}}>{c.certification_type}</span>
                          <span style={{color:'#94a3b8'}}>{c.expiry_date ? formatDate(c.expiry_date) : ''}</span>
                          <span style={{width:7,height:7,borderRadius:'50%',background:b.color,flexShrink:0}} />
                        </div>
                      )
                    })}
                    {certsExtra > 0 && <span style={{fontSize:11,color:'#64748b',alignSelf:'center'}}>+{certsExtra} more</span>}
                  </div>
                )}
              </div>
              {/* Experience */}
              <div style={{background:'#f8fafc',padding:'16px 24px'}}>
                <div style={{fontSize:11,fontWeight:700,color:'#1e3a8a',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Work Experience</div>
                {(w.experiences||[]).map((exp,i) => (
                  <div key={i} style={{fontSize:12,color:'#475569',marginBottom:4}}>{exp.company} — {exp.role} — {exp.dates||''}</div>
                ))}
                <div style={{fontSize:12,fontWeight:600,color:'#1e3a8a'}}>Innovation Technologies LLC — {w.trade_role} — {w.joining_date ? formatDate(w.joining_date) : '—'} to Present</div>
              </div>
              {/* Footer */}
              <div style={{background:'#0f172a',padding:'12px 24px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:10,color:'#e2e8f0'}}>ISO 9001:2015 | 14001:2015 | 45001:2018 Certified</div>
                <div style={{fontSize:10,color:'#e2e8f0'}}>CONFIDENTIAL — Prepared for client submission only</div>
                <div style={{fontSize:10,color:'#e2e8f0'}}>Generated: {todayFormatted}</div>
              </div>
            </div>
          </div>
        </div>)
      })()}

    </AppShell>
  )
}
