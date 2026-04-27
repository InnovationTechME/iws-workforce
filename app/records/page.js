'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { STARTERS } from '../../lib/whatsappTemplates'

const RECORD_ITEMS = [
  { category:'Policies', name:'Worker Policy Manual', owner:'HR', status:'Template', route:'/packs', detail:'Included in document packs for worker onboarding.' },
  { category:'Policies', name:'Passport Safekeeping Acknowledgement', owner:'HR', status:'Template', route:'/packs', detail:'Worker acknowledgement for passport handling and return.' },
  { category:'Policies', name:'PPE and Site Safety Memo', owner:'Operations', status:'Template', route:'/inbox', detail:'Operational memo for workers and site teams.' },
  { category:'Letters', name:'Offer Letter', owner:'HR', status:'Live', route:'/offers', detail:'Offer validity should be 7 days; not a document expiry.' },
  { category:'Letters', name:'Warning Letter', owner:'HR', status:'Live', route:'/warnings', detail:'Used for disciplinary records and worker warnings.' },
  { category:'Letters', name:'Experience Letter', owner:'HR', status:'Live', route:'/workers', detail:'Generated from worker profile where applicable.' },
  { category:'Letters', name:'Termination Notice', owner:'HR', status:'Planned', route:'/offboarding-exit', detail:'Part of the fuller offboarding workflow.' },
  { category:'Letters', name:'Full and Final Settlement', owner:'Accounts', status:'Later PR', route:'/offboarding-exit', detail:'Keep EOS/final settlement as a dedicated workstream.' },
  { category:'Registers', name:'Worker Register', owner:'HR', status:'Live', route:'/workers', detail:'Permanent worker numbers are internal IDs and should not be reused.' },
  { category:'Registers', name:'Supplier Register', owner:'Operations', status:'Live', route:'/suppliers', detail:'Supplier companies, PO references, rates, workers, and summaries.' },
  { category:'Registers', name:'Document Register', owner:'HR', status:'Live', route:'/documents', detail:'Expiry tracking and signed document links.' },
  { category:'Registers', name:'Payroll Register', owner:'Accounts', status:'Live', route:'/payroll', detail:'Payroll batches and locked payroll records.' },
  { category:'Registers', name:'Offboarding Register', owner:'HR', status:'Live', route:'/offboarding-exit', detail:'Worker exit checklist and file closure record.' },
]

const CATEGORIES = ['All','Policies','Letters','Registers','WhatsApp']

function toneFor(status) {
  if (status === 'Live') return 'success'
  if (status === 'Later PR' || status === 'Planned') return 'warning'
  return 'neutral'
}

export default function RecordsPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')

  const whatsappItems = useMemo(() => Object.entries(STARTERS || {}).map(([key, value]) => ({
    category:'WhatsApp',
    name:value.label || key,
    owner:value.owner || 'HR',
    status:'Template',
    route:'/inbox',
    detail:value.description || 'WhatsApp starter template.'
  })), [])

  const rows = useMemo(() => {
    const all = [...RECORD_ITEMS, ...whatsappItems]
    const q = query.trim().toLowerCase()
    return all.filter(item => {
      const matchesCategory = category === 'All' || item.category === category
      const haystack = `${item.category} ${item.name} ${item.owner} ${item.status} ${item.detail}`.toLowerCase()
      return matchesCategory && (!q || haystack.includes(q))
    })
  }, [category, query, whatsappItems])

  return (
    <AppShell pageTitle="Records and templates">
      <PageHeader
        eyebrow="Records"
        title="Records and templates"
        description="One place to review internal policies, letters, registers, and reusable message templates."
        actions={<Link className="btn btn-secondary" href="/reports">Open reports</Link>}
      />

      <div className="panel" style={{marginBottom:12}}>
        <div style={{display:'grid',gridTemplateColumns:'minmax(220px,1fr) 220px',gap:10}}>
          <input className="form-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search policies, letters, registers..." />
          <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><div><h2>Library</h2><p>Templates can be reviewed here; live records stay in their operational pages.</p></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Category</th><th>Name</th><th>Owner</th><th>Status</th><th>Where used</th></tr></thead>
            <tbody>{rows.map((item, index) => (
              <tr key={`${item.category}-${item.name}-${index}`}>
                <td>{item.category}</td>
                <td><div style={{fontWeight:600}}>{item.name}</div><div style={{fontSize:12,color:'var(--muted)'}}>{item.detail}</div></td>
                <td>{item.owner}</td>
                <td><StatusBadge label={item.status} tone={toneFor(item.status)} /></td>
                <td><Link className="btn btn-secondary btn-sm" href={item.route}>Open</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
