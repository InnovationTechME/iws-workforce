'use client'

import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'

const workflows = [
  {
    title: 'Subcontract workers',
    lines: [
      'Add the supplier company first.',
      'Keep the supplier active and add rates or PO details before onboarding the worker.',
      'Assign every subcontract worker to a real supplier, not a placeholder supplier.',
    ],
  },
  {
    title: 'Onboarding',
    lines: [
      'Choose the correct worker type.',
      'Enter identity, contact, payroll, and supplier details.',
      'Upload required documents and complete only when blocking items are valid.',
    ],
  },
  {
    title: 'Timesheets',
    lines: [
      'Create or upload the month timesheet.',
      'Review absences, overtime, missing workers, and conflicts before payroll.',
      'Treat edits after payroll approval as corrections with a reason.',
    ],
  },
  {
    title: 'Payroll',
    lines: [
      'Select the month, review included workers, deductions, overtime, allowances, and advances.',
      'Subcontract workers should go to supplier summaries, not direct payroll.',
      'Approve only after HR/accounts review; payslips should show deduction breakdown.',
    ],
  },
  {
    title: 'Warnings and payslips',
    lines: [
      'Generate or upload the document, then distribute by approved company method.',
      'Record delivery method, sent date, sender, and acknowledgement in Delivery Log.',
      'Keep warnings open until management closes or resolves them.',
    ],
  },
  {
    title: 'Offboarding',
    lines: [
      'Set reason and last working date.',
      'Stop future payroll inclusion where applicable.',
      'Close the file only after final documents and accounts review are complete.',
    ],
  },
]

const approvals = [
  'Delete workers, suppliers, documents, timesheets, or payroll only after management approval.',
  'Export a backup before bulk import, cleanup, deletion, payroll re-run, or supplier reassignment.',
  'Do not reuse staff numbers once issued. Keep old workers inactive or offboarded for history.',
  'Use archive or inactive status before permanent delete wherever history matters.',
]

export default function InstructionsPage() {
  return (
    <AppShell pageTitle="Instructions">
      <PageHeader
        eyebrow="System guide"
        title="Instructions and backup"
        description="Operational rules for using the workforce system safely."
      />

      <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:12,marginBottom:18}}>
        <div className="panel" style={{padding:18}}>
          <p className="eyebrow" style={{marginBottom:8}}>Live data</p>
          <h2 style={{fontSize:18,fontWeight:700,marginBottom:8}}>Why records are showing</h2>
          <p style={{fontSize:13,lineHeight:1.6,color:'var(--muted)',margin:0}}>
            Workers and records on the dashboard come from live Supabase data, not mock front-end cards.
            After the approved cleanup, operational workers, suppliers, documents, timesheets, payroll,
            offboarding records, clients, and old uploaded files are cleared.
          </p>
        </div>
        <div className="panel" style={{padding:18}}>
          <p className="eyebrow" style={{marginBottom:8}}>Cleanup</p>
          <h2 style={{fontSize:18,fontWeight:700,marginBottom:8}}>Current repair item</h2>
          <p style={{fontSize:13,lineHeight:1.6,color:'var(--muted)',margin:0}}>
            Historical subcontract workers were assigned to an inactive placeholder supplier. They should
            be repaired before the placeholder supplier is removed.
          </p>
        </div>
        <div className="panel" style={{padding:18}}>
          <p className="eyebrow" style={{marginBottom:8}}>Backup</p>
          <h2 style={{fontSize:18,fontWeight:700,marginBottom:8}}>Before risky changes</h2>
          <p style={{fontSize:13,lineHeight:1.6,color:'var(--muted)',margin:0}}>
            Run a data audit, export a local backup, and include Storage files if uploaded documents
            could be changed or deleted.
          </p>
        </div>
        <div className="panel" style={{padding:18}}>
          <p className="eyebrow" style={{marginBottom:8}}>Import</p>
          <h2 style={{fontSize:18,fontWeight:700,marginBottom:8}}>Existing records</h2>
          <p style={{fontSize:13,lineHeight:1.6,color:'var(--muted)',margin:0}}>
            Import suppliers first, then workers. Subcontract workers must match an active supplier name.
            Keep original joining dates and worker numbers for existing staff.
          </p>
        </div>
      </section>

      <section className="panel" style={{padding:18,marginBottom:18}}>
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:12,marginBottom:14}}>
          <div>
            <p className="eyebrow" style={{marginBottom:6}}>End to end</p>
            <h2 style={{fontSize:20,fontWeight:700}}>Workflow instructions</h2>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:12}}>
          {workflows.map(item => (
            <div key={item.title} style={{border:'1px solid var(--border)',borderRadius:8,padding:14,background:'#fff'}}>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:10}}>{item.title}</h3>
              <ul style={{margin:0,paddingLeft:18,color:'var(--muted)',fontSize:13,lineHeight:1.6}}>
                {item.lines.map(line => <li key={line}>{line}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section style={{display:'grid',gridTemplateColumns:'minmax(0,1.1fr) minmax(280px,0.9fr)',gap:12}}>
        <div className="panel" style={{padding:18}}>
          <p className="eyebrow" style={{marginBottom:8}}>Approval map</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(120px,1fr))',gap:8,overflowX:'auto'}}>
            {['Audit live data', 'Export backup', 'Classify records', 'Approve changes'].map((step, index) => (
              <div key={step} style={{border:'1px solid var(--border)',borderRadius:8,padding:12,minHeight:92,background:index === 3 ? '#fff7ed' : '#fff'}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--hint)',marginBottom:8}}>STEP {index + 1}</div>
                <div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>{step}</div>
              </div>
            ))}
          </div>
          <p style={{fontSize:12,lineHeight:1.6,color:'var(--muted)',margin:'12px 0 0'}}>
            Records should be classified as keep, archive, repair, or delete. Permanent delete needs approval.
          </p>
        </div>

        <div className="panel" style={{padding:18}}>
          <p className="eyebrow" style={{marginBottom:8}}>Rules</p>
          <ul style={{margin:0,paddingLeft:18,color:'var(--muted)',fontSize:13,lineHeight:1.7}}>
            {approvals.map(item => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </section>
    </AppShell>
  )
}
