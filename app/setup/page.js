'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { supabase } from '../../lib/supabaseClient'

const steps = [
  {
    title: 'Check backup',
    detail: 'Confirm a backup exists before importing real records.',
    href: '/instructions',
    cta: 'Open instructions',
  },
  {
    title: 'Import suppliers',
    detail: 'Subcontract workers need their company first.',
    href: '/suppliers',
    cta: 'Open suppliers',
  },
  {
    title: 'Import workers',
    detail: 'Keep existing staff numbers and original joining dates.',
    href: '/workers',
    cta: 'Open workers',
  },
  {
    title: 'Upload documents',
    detail: 'Attach current passport, EID, visa, labour, insurance, and certificates.',
    href: '/documents',
    cta: 'Open documents',
  },
  {
    title: 'Run payroll test',
    detail: 'Use a small sample month before importing everyone.',
    href: '/payroll-run',
    cta: 'Open payroll',
  },
  {
    title: 'Review audit',
    detail: 'Check delivery, audit, and trash logs after setup.',
    href: '/audit-log',
    cta: 'Open audit',
  },
]

async function countTable(table) {
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true })
  if (error) return null
  return count || 0
}

export default function SetupPage() {
  const [counts, setCounts] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = {
        suppliers: await countTable('suppliers'),
        workers: await countTable('workers'),
        documents: await countTable('documents'),
        timesheets: await countTable('timesheet_headers'),
        payroll: await countTable('payroll_batches'),
        deliveries: await countTable('document_deliveries'),
      }
      if (!cancelled) setCounts(result)
    })()
    return () => { cancelled = true }
  }, [])

  const readyForImport = counts && counts.workers === 0 && counts.suppliers === 0

  return (
    <AppShell pageTitle="Start Here">
      <PageHeader
        eyebrow="Setup"
        title="Start here"
        description="Use this page to bring the clean system into real operation."
        actions={<Link className="btn btn-primary" href="/workflow-map">Open A3 Map</Link>}
      />

      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:18}}>
        {[
          ['Suppliers', counts?.suppliers],
          ['Workers', counts?.workers],
          ['Documents', counts?.documents],
          ['Timesheets', counts?.timesheets],
          ['Payroll batches', counts?.payroll],
          ['Deliveries', counts?.deliveries],
        ].map(([label, value]) => (
          <div key={label} className="stat-card">
            <div className="num" style={{fontSize:28}}>{value ?? '...'}</div>
            <div className="lbl">{label}</div>
          </div>
        ))}
      </section>

      <div className="panel" style={{marginBottom:18,borderColor:readyForImport ? '#86efac' : 'var(--border)',background:readyForImport ? '#f0fdf4' : '#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}>
          <div>
            <h2 style={{fontSize:18,fontWeight:700,marginBottom:6}}>Current setup status</h2>
            <p style={{fontSize:13,color:'var(--muted)',lineHeight:1.6,margin:0}}>
              {readyForImport
                ? 'The operational database is clean and ready for supplier and worker imports.'
                : 'The system contains operational records. Back up before further import or cleanup.'}
            </p>
          </div>
          <StatusBadge label={readyForImport ? 'Ready' : 'Review'} tone={readyForImport ? 'success' : 'warning'} />
        </div>
      </div>

      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:12}}>
        {steps.map((step, index) => (
          <div key={step.title} className="panel" style={{padding:16}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--hint)',marginBottom:8}}>STEP {index + 1}</div>
            <h3 style={{fontSize:16,fontWeight:700,marginBottom:8}}>{step.title}</h3>
            <p style={{fontSize:13,color:'var(--muted)',lineHeight:1.5,minHeight:40}}>{step.detail}</p>
            <Link className="btn btn-secondary btn-sm" href={step.href}>{step.cta}</Link>
          </div>
        ))}
      </section>

      <div className="panel" style={{marginTop:18}}>
        <h2 style={{fontSize:18,fontWeight:700,marginBottom:10}}>Import commands</h2>
        <div style={{display:'grid',gap:8,fontSize:12,color:'var(--muted)'}}>
          <code>npm run data:import-suppliers -- import-templates/suppliers.csv --dry-run</code>
          <code>npm run data:import-workers -- import-templates/existing-workers.csv --dry-run</code>
          <code>npm run data:import-suppliers -- import-templates/suppliers.csv --apply</code>
          <code>npm run data:import-workers -- import-templates/existing-workers.csv --apply</code>
        </div>
      </div>
    </AppShell>
  )
}
