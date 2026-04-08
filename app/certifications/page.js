'use client'
import { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import DrawerForm from '../../components/DrawerForm'
import { getCertifications, addCertification, makeId } from '../../lib/mockStore'
import { formatDate, getStatusTone } from '../../lib/utils'

const CERT_TYPES = ['Working at Height','H2S Awareness','Confined Space Entry','First Aid','Welding Certificate','Rigger/Banksman','Scaffolder','Forklift Operator','IPAF/MEWP','Electrician Licence','BOSIET/HUET','Safety Officer','HSE Officer','Custom']

export default function CertificationsPage() {
  const [certs, setCerts] = useState([])
  const [queue, setQueue] = useState('expired')
  const [showDrawer, setShowDrawer] = useState(false)
  const [form, setForm] = useState({ worker_id:'', certification_type:'Working at Height', issuer:'', issue_date:'', expiry_date:'', renewal_required:false })

  useEffect(() => { setCerts(getCertifications()) }, [])

  const queues = {
    expired: certs.filter(c => c.status === 'expired'),
    expiring_soon: certs.filter(c => c.status === 'expiring_soon'),
    renewal_required: certs.filter(c => c.renewal_required),
    valid: certs.filter(c => c.status === 'valid')
  }

  const current = queues[queue] || []

  const handleAdd = () => {
    const cert = { ...form, id: makeId('cert'), status: 'valid', file_url: null }
    addCertification(cert)
    setCerts(getCertifications())
    setShowDrawer(false)
  }

  return (
    <AppShell pageTitle="Certifications">
      <PageHeader eyebrow="Certifications" title="Certification queue" description="Track safety and trade certifications by expiry and renewal status."
        actions={<button className="btn btn-primary" onClick={() => setShowDrawer(true)}>+ Add Certification</button>} />

      <div className="summary-strip">
        {[['Expired',queues.expired.length,'danger'],['Expiring soon',queues.expiring_soon.length,'warning'],['Renewal required',queues.renewal_required.length,'warning'],['Valid',queues.valid.length,'success']].map(([label,count,tone]) => (
          <div key={label} className="stat-card" style={{cursor:'pointer'}} onClick={() => setQueue(label.toLowerCase().replace(/ /g,'_'))}>
            <div className={`num ${tone}`} style={{fontSize:20}}>{count}</div>
            <div className="lbl">{label}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="toolbar">
          {['expired','expiring_soon','renewal_required','valid'].map(q => (
            <button key={q} className={`btn btn-sm ${queue===q?'btn-teal':'btn-secondary'}`} onClick={() => setQueue(q)}>{q.replace(/_/g,' ')}</button>
          ))}
        </div>
        {current.length === 0 ? <div className="empty-state"><h3>No certifications in this queue</h3></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Worker ID</th><th>Certification</th><th>Issuer</th><th>Expiry</th><th>Renewal</th><th>Status</th></tr></thead>
              <tbody>
                {current.map(c => (
                  <tr key={c.id}>
                    <td style={{fontWeight:500,color:'var(--teal)'}}>{c.worker_id}</td>
                    <td style={{fontWeight:500}}>{c.certification_type}</td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{c.issuer}</td>
                    <td style={{fontSize:12,color:'var(--muted)'}}>{formatDate(c.expiry_date)}</td>
                    <td>{c.renewal_required ? <StatusBadge label="Required" tone="warning" /> : <StatusBadge label="No" tone="neutral" />}</td>
                    <td><StatusBadge label={c.status} tone={getStatusTone(c.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDrawer && (
        <DrawerForm title="Add Certification" onClose={() => setShowDrawer(false)}
          footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button className="btn btn-secondary" onClick={() => setShowDrawer(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAdd}>Add</button></div>}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div className="form-grid">
              <div className="form-field"><label className="form-label">Worker ID</label><input className="form-input" value={form.worker_id} onChange={e => setForm({...form,worker_id:e.target.value})} placeholder="w-001" /></div>
              <div className="form-field"><label className="form-label">Certification type</label><select className="form-select" value={form.certification_type} onChange={e => setForm({...form,certification_type:e.target.value})}>{CERT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
              <div className="form-field"><label className="form-label">Issuer</label><input className="form-input" value={form.issuer} onChange={e => setForm({...form,issuer:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Issue date</label><input className="form-input" type="date" value={form.issue_date} onChange={e => setForm({...form,issue_date:e.target.value})} /></div>
              <div className="form-field"><label className="form-label">Expiry date</label><input className="form-input" type="date" value={form.expiry_date} onChange={e => setForm({...form,expiry_date:e.target.value})} /></div>
            </div>
            <div className="form-field"><label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}><input type="checkbox" checked={form.renewal_required} onChange={e => setForm({...form,renewal_required:e.target.checked})} /><span className="form-label" style={{margin:0}}>Renewal required</span></label></div>
          </div>
        </DrawerForm>
      )}
    </AppShell>
  )
}
