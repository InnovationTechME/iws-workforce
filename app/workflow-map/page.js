'use client'

import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'

const lanes = [
  {
    title: '1. Setup',
    color: '#0f766e',
    items: [
      ['Backup', 'Export database and Storage before import or cleanup.'],
      ['Users', 'Owner, management, HR, accounts, operations.'],
      ['Numbering', 'Keep existing staff numbers. Never reuse numbers.'],
    ],
  },
  {
    title: '2. Suppliers',
    color: '#2563eb',
    items: [
      ['Create company', 'Supplier profile, PO, contact, rates.'],
      ['Rate table', 'Trade role and hourly rate snapshot.'],
      ['Approval', 'Management confirms real supplier before workers.'],
    ],
  },
  {
    title: '3. Existing Workers',
    color: '#7c3aed',
    items: [
      ['Import', 'Worker number, joining date, category, salary/rate.'],
      ['History', 'Opening leave, warnings, document expiry, payroll flags.'],
      ['Supplier link', 'Subcontract workers must match a live supplier.'],
    ],
  },
  {
    title: '4. Documents',
    color: '#0891b2',
    items: [
      ['Upload', 'Passport, EID, visa, labour, insurance, certificates.'],
      ['Storage', 'Files stored privately in Supabase Storage.'],
      ['Expiry queues', 'Dashboard and HR inbox show missing/expired items.'],
    ],
  },
  {
    title: '5. Timesheets',
    color: '#ca8a04',
    items: [
      ['Upload or grid', 'Monthly site hours by worker and date.'],
      ['Reconcile', 'Resolve conflicts before payroll.'],
      ['Approval', 'Operations confirms hours.'],
    ],
  },
  {
    title: '6. Payroll',
    color: '#dc2626',
    items: [
      ['Calculate', 'Gross, absence deductions, allowances, overtime.'],
      ['Review', 'HR/accounts checks lines and WPS split.'],
      ['Lock', 'Management approval locks payroll.'],
    ],
  },
  {
    title: '7. Distribution',
    color: '#16a34a',
    items: [
      ['Payslips', 'Download PDF/ZIP or send WhatsApp starter.'],
      ['Warnings', 'Generate/record warning letters.'],
      ['Delivery log', 'Method, recipient, sent by, status, acknowledgement.'],
    ],
  },
  {
    title: '8. Safety',
    color: '#475569',
    items: [
      ['Audit log', 'Database-level insert/update/delete history.'],
      ['Trash', 'Deleted rows captured for restore review.'],
      ['Backups', 'Local exports plus Supabase platform backups/PITR.'],
    ],
  },
]

export default function WorkflowMapPage() {
  return (
    <AppShell pageTitle="Workflow Map">
      <style>{`
        @page { size: A3 landscape; margin: 10mm; }
        @media print {
          .sidebar, .topbar, .page-header, .no-print { display: none !important; }
          .main-area, .page-shell { margin: 0 !important; padding: 0 !important; }
          .a3-map { box-shadow: none !important; border: 0 !important; width: 100% !important; min-height: auto !important; }
        }
      `}</style>
      <PageHeader
        eyebrow="A3 operating map"
        title="End-to-end workflow"
        description="Printable map of what happens, what gets created, and where approvals are needed."
        actions={<button className="btn btn-primary no-print" onClick={() => window.print()}>Print A3</button>}
      />

      <div className="a3-map" style={{background:'#fff',border:'1px solid var(--border)',borderRadius:8,padding:18,boxShadow:'0 8px 24px rgba(15,23,42,0.08)'}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-end',marginBottom:14}}>
          <div>
            <div style={{fontSize:28,fontWeight:800,color:'#0f172a'}}>IWS Workforce System</div>
            <div style={{fontSize:13,color:'#64748b'}}>Clean start to payroll, delivery, audit, and backup</div>
          </div>
          <div style={{fontSize:11,color:'#64748b',textAlign:'right'}}>Production: iws-workforce.vercel.app<br />Data: Supabase Postgres and private Storage</div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          {lanes.map((lane) => (
            <div key={lane.title} style={{border:'1px solid #e2e8f0',borderTop:`5px solid ${lane.color}`,borderRadius:8,padding:12,minHeight:230}}>
              <h2 style={{fontSize:15,fontWeight:800,color:lane.color,marginBottom:10}}>{lane.title}</h2>
              <div style={{display:'grid',gap:8}}>
                {lane.items.map(([title, detail]) => (
                  <div key={title} style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:6,padding:9}}>
                    <div style={{fontSize:12,fontWeight:800,color:'#0f172a',marginBottom:3}}>{title}</div>
                    <div style={{fontSize:10.5,color:'#475569',lineHeight:1.35}}>{detail}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginTop:12}}>
          <div style={{border:'1px solid #bbf7d0',background:'#f0fdf4',borderRadius:8,padding:12}}>
            <div style={{fontSize:12,fontWeight:800,color:'#166534',marginBottom:6}}>Approvals needed</div>
            <div style={{fontSize:11,color:'#166534',lineHeight:1.45}}>Supplier validity, payroll lock, destructive cleanup, restore decisions, and offboarding closure.</div>
          </div>
          <div style={{border:'1px solid #bfdbfe',background:'#eff6ff',borderRadius:8,padding:12}}>
            <div style={{fontSize:12,fontWeight:800,color:'#1d4ed8',marginBottom:6}}>Created records</div>
            <div style={{fontSize:11,color:'#1d4ed8',lineHeight:1.45}}>Suppliers, rates, workers, documents, timesheet headers/lines, payroll batches/lines, deliveries, audit logs, deleted snapshots.</div>
          </div>
          <div style={{border:'1px solid #fed7aa',background:'#fff7ed',borderRadius:8,padding:12}}>
            <div style={{fontSize:12,fontWeight:800,color:'#9a3412',marginBottom:6}}>Backup rule</div>
            <div style={{fontSize:11,color:'#9a3412',lineHeight:1.45}}>Before bulk import, reset, delete, payroll re-run, or Storage cleanup: run database backup and file backup.</div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
