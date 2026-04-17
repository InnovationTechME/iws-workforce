'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import StatusBadge from './StatusBadge'
import { getBatchesPendingApproval } from '../lib/payrollService'
import { getRole } from '../lib/mockAuth'

export default function ApprovalsDashboard() {
  const router = useRouter()
  const [role, setRoleState] = useState(null)
  const [payrollItems, setPayrollItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const r = getRole()
        setRoleState(r)
        const batches = await getBatchesPendingApproval(r)
        setPayrollItems(batches)
      } catch (err) {
        console.error('ApprovalsDashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading || !role) return null
  if (payrollItems.length === 0) return null

  const getStepForBatch = (b) => {
    if (b.status === 'calculated' && b.ops_approval_status === 'pending') return 3
    if (b.status === 'ops_approved' && b.owner_approval_status === 'pending') return 4
    if (b.ops_approval_status === 'rejected') return 2
    if (b.owner_approval_status === 'rejected') return 4
    return 3
  }

  const getBadge = (b) => {
    if (b.ops_approval_status === 'rejected') return { label: 'Ops Rejected', tone: 'danger' }
    if (b.owner_approval_status === 'rejected') return { label: 'Owner Rejected', tone: 'danger' }
    if (b.status === 'ops_approved' && b.owner_approval_status === 'pending') return { label: 'Awaiting Owner', tone: 'warning' }
    if (b.status === 'calculated' && b.ops_approval_status === 'pending') return { label: 'Awaiting Ops', tone: 'warning' }
    return { label: b.status, tone: 'neutral' }
  }

  return (
    <div className="panel" style={{border:'2px solid var(--warning-border)',background:'#fffdf7'}}>
      <div className="panel-header">
        <div><h2>Pending Approvals</h2><p>{payrollItems.length} payroll item{payrollItems.length !== 1 ? 's' : ''} require{payrollItems.length === 1 ? 's' : ''} your attention</p></div>
        <StatusBadge label={`${payrollItems.length} pending`} tone="warning" />
      </div>

      <div style={{marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:'var(--text)',marginBottom:8}}>Payroll Batches ({payrollItems.length})</div>
        {payrollItems.map(b => {
          const badge = getBadge(b)
          const step = getStepForBatch(b)
          return (
            <div key={b.id} style={{background:'#eff6ff',border:'1px solid var(--border)',borderRadius:8,padding:'12px 16px',marginBottom:6,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{b.month_label} Payroll</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>
                  {b.worker_count} workers · Net AED {Number(b.total_net || 0).toLocaleString(undefined,{minimumFractionDigits:2})}
                  {b.ops_approval_status === 'approved' && ' · ✓ Ops approved'}
                  {b.ops_approval_status === 'rejected' && ` · ✕ Ops rejected: ${(b.ops_rejection_reason || '').slice(0, 60)}`}
                  {b.owner_approval_status === 'rejected' && ` · ✕ Owner rejected: ${(b.owner_rejection_reason || '').slice(0, 60)}`}
                </div>
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
                <StatusBadge label={badge.label} tone={badge.tone} />
                <button className="btn btn-teal btn-sm" onClick={() => router.push(`/payroll-run?step=${step}`)}>Review →</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
