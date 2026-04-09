'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '../../components/AppShell'
import { getDashboardMetrics, getInboxItems } from '../../lib/mockStore'
import { formatDate } from '../../lib/utils'

export default function DashboardPage() {
  const [metrics, setMetrics] = useState(null)
  const [inbox, setInbox] = useState(null)
  const router = useRouter()

  useEffect(() => {
    setMetrics(getDashboardMetrics())
    setInbox(getInboxItems())
  }, [])

  if (!metrics || !inbox) return null

  const now = new Date()
  const dayName = now.toLocaleDateString('en-GB',{weekday:'long'})
  const dateStr = now.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})

  const alertCards = [
    { key:'absent', label:'Absent Today', value: inbox.leaveRequests?.filter(l=>l.status==='pending').length || 0, sub:'pending approval', tone:'danger', icon:'🚨', href:'/attendance', priority:1 },
    { key:'expDocs', label:'Expired Documents', value: inbox.expiredDocs?.length||0, sub:'action required', tone:'danger', icon:'📄', href:'/documents', priority:2 },
    { key:'expCerts', label:'Expired Certifications', value: inbox.expiredCerts?.length||0, sub:'action required', tone:'danger', icon:'🏅', href:'/certifications', priority:3 },
    { key:'warnings', label:'Open Warnings', value: inbox.openWarnings?.length||0, sub:'unresolved', tone:'danger', icon:'⚠️', href:'/warnings', priority:4 },
    { key:'missingDocs', label:'Missing Documents', value: inbox.missingDocs?.length||0, sub:'to be uploaded', tone:'warning', icon:'📋', href:'/documents', priority:5 },
    { key:'expiringDocs', label:'Expiring Soon', value: inbox.expiringDocs?.length||0, sub:'within 30 days', tone:'warning', icon:'⏰', href:'/documents', priority:6 },
    { key:'expiringCerts', label:'Certs Expiring', value: inbox.expiringCerts?.length||0, sub:'within 30 days', tone:'warning', icon:'🔔', href:'/certifications', priority:7 },
    { key:'timesheets', label:'Pending Timesheets', value: inbox.pendingTimesheets?.length||0, sub:'awaiting approval', tone:'info', icon:'🕐', href:'/timesheets', priority:8 },
  ].sort((a,b) => a.priority - b.priority)

  const toneStyles = {
    danger: { bg:'#fff1f2', border:'#fca5a5', numColor:'#dc2626' },
    warning: { bg:'#fffbeb', border:'#fcd34d', numColor:'#d97706' },
    info: { bg:'#eff6ff', border:'#93c5fd', numColor:'#2563eb' },
    success: { bg:'#f0fdf4', border:'#86efac', numColor:'#16a34a' },
  }

  return (
    <AppShell pageTitle="Dashboard">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <div style={{fontSize:13,color:'var(--muted)',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.5px'}}>{dayName}</div>
          <div style={{fontSize:22,fontWeight:700,color:'var(--text)'}}>{dateStr}</div>
        </div>
        <div style={{fontSize:12,color:'var(--hint)',textAlign:'right'}}>
          Innovation Technologies LLC O.P.C.<br/>
          <span style={{color:'var(--teal)',fontWeight:600}}>IWS Workforce System</span>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:12,marginBottom:20}}>
        <div style={{background:'linear-gradient(135deg,#0d9488,#0891b2)',borderRadius:12,padding:'20px 24px',color:'white',cursor:'pointer'}} onClick={()=>router.push('/workers')}>
          <div style={{fontSize:11,fontWeight:600,opacity:0.8,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>Today's Total Workforce</div>
          <div style={{fontSize:48,fontWeight:800,lineHeight:1}}>{metrics.activeWorkers || 0}</div>
          <div style={{fontSize:12,opacity:0.8,marginTop:6}}>Active workers on record</div>
          <div style={{display:'flex',gap:16,marginTop:12,fontSize:11}}>
            <span style={{opacity:0.9}}>Direct: {metrics.byCategory?.['Direct Employee']||0}</span>
            <span style={{opacity:0.9}}>Hourly: {metrics.byCategory?.['Contracted Hourly Worker']||0}</span>
            <span style={{opacity:0.9}}>Sub: {metrics.byCategory?.['Subcontractor']||0}</span>
            <span style={{opacity:0.9}}>Office: {metrics.byCategory?.['Office Staff']||0}</span>
          </div>
        </div>

        <div style={{background: (inbox.leaveRequests?.filter(l=>l.status==='pending').length||0) > 0 ? '#fff1f2':'#f0fdf4', border:'1.5px solid '+((inbox.leaveRequests?.filter(l=>l.status==='pending').length||0)>0?'#fca5a5':'#86efac'),borderRadius:12,padding:'20px 20px',cursor:'pointer'}} onClick={()=>router.push('/attendance')}>
          <div style={{fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>Absent Today</div>
          <div style={{fontSize:40,fontWeight:800,color:(inbox.leaveRequests?.filter(l=>l.status==='pending').length||0)>0?'#dc2626':'#16a34a',lineHeight:1}}>
            {inbox.leaveRequests?.filter(l=>l.status==='pending').length||0}
          </div>
          <div style={{fontSize:11,color:'var(--muted)',marginTop:6}}>Pending leave requests</div>
        </div>

        <div style={{background:'#fff',border:'1.5px solid var(--border)',borderRadius:12,padding:'20px 20px',cursor:'pointer'}} onClick={()=>router.push('/inbox')}>
          <div style={{fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>HR Inbox</div>
          <div style={{fontSize:40,fontWeight:800,color:'var(--teal)',lineHeight:1}}>
            {Object.values(inbox).reduce((s,a)=>s+a.length,0)}
          </div>
          <div style={{fontSize:11,color:'var(--muted)',marginTop:6}}>Total items to action</div>
        </div>

        <div style={{background:'#fff',border:'1.5px solid var(--border)',borderRadius:12,padding:'20px 20px',cursor:'pointer'}} onClick={()=>router.push('/payroll')}>
          <div style={{fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>Payroll</div>
          <div style={{fontSize:16,fontWeight:700,color:'var(--text)',lineHeight:1.3,marginTop:4}}>April 2026</div>
          <div style={{fontSize:11,color:'var(--warning)',marginTop:6,fontWeight:500}}>Ready for review</div>
        </div>
      </div>

      <div style={{marginBottom:8}}>
        <div style={{fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:10}}>Action Queue — Priority Order</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          {alertCards.map(card => {
            const ts = toneStyles[card.tone] || toneStyles.info
            const isUrgent = card.value > 0 && card.tone === 'danger'
            return (
              <div key={card.key}
                style={{background: card.value > 0 ? ts.bg : '#fafafa', border:'1.5px solid '+(card.value>0?ts.border:'#e2e8f0'),borderRadius:10,padding:'14px 16px',cursor:'pointer',transition:'all 0.15s',position:'relative',overflow:'hidden'}}
                onClick={() => router.push(card.href)}
              >
                {isUrgent && <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'#dc2626',borderRadius:'10px 10px 0 0'}} />}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{fontSize:18}}>{card.icon}</div>
                  {card.value > 0 && <div style={{fontSize:9,fontWeight:700,color:ts.numColor,background:ts.bg,border:'1px solid '+ts.border,borderRadius:10,padding:'1px 6px'}}>{isUrgent?'URGENT':'REVIEW'}</div>}
                </div>
                <div style={{fontSize:28,fontWeight:800,color:card.value>0?ts.numColor:'var(--hint)',lineHeight:1,margin:'6px 0'}}>{card.value}</div>
                <div style={{fontSize:11,fontWeight:600,color:'var(--text)'}}>{card.label}</div>
                <div style={{fontSize:10,color:'var(--hint)',marginTop:2}}>{card.sub}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:16}}>
        <div className="panel">
          <div className="panel-header"><div><h2>⚠ Expired documents</h2><p>Click any row to open document</p></div></div>
          {inbox.expiredDocs?.length === 0
            ? <div style={{color:'var(--hint)',fontSize:13,padding:'8px 0'}}>All clear</div>
            : <div className="table-wrap"><table>
                <thead><tr><th>Worker</th><th>Document</th><th>Expired</th></tr></thead>
                <tbody>
                  {inbox.expiredDocs?.slice(0,6).map(d=>(
                    <tr key={d.id} style={{cursor:'pointer',background:'#fff8f8'}} onClick={()=>router.push('/documents')}>
                      <td style={{fontSize:12,fontWeight:500,color:'var(--teal)'}}>{d.worker_id}</td>
                      <td style={{fontSize:12}}>{d.document_type}</td>
                      <td style={{fontSize:11,color:'#dc2626',fontWeight:500}}>{formatDate(d.expiry_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
          }
        </div>
        <div className="panel">
          <div className="panel-header"><div><h2>⚠ Expired certifications</h2><p>Click any row to open certification</p></div></div>
          {inbox.expiredCerts?.length === 0
            ? <div style={{color:'var(--hint)',fontSize:13,padding:'8px 0'}}>All clear</div>
            : <div className="table-wrap"><table>
                <thead><tr><th>Worker</th><th>Certification</th><th>Expired</th></tr></thead>
                <tbody>
                  {inbox.expiredCerts?.slice(0,6).map(c=>(
                    <tr key={c.id} style={{cursor:'pointer',background:'#fff8f8'}} onClick={()=>router.push('/certifications')}>
                      <td style={{fontSize:12,fontWeight:500,color:'var(--teal)'}}>{c.worker_id}</td>
                      <td style={{fontSize:12}}>{c.certification_type}</td>
                      <td style={{fontSize:11,color:'#dc2626',fontWeight:500}}>{formatDate(c.expiry_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
          }
        </div>
      </div>
    </AppShell>
  )
}
