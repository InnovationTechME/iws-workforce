'use client'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import { supabase } from '../lib/supabaseClient'
import { TODAY } from '../lib/utils'

export default function AppShell({ children, pageTitle }) {
  const [alertDots, setAlertDots] = useState({})

  useEffect(() => {
    let cancelled = false
    async function loadAlertDots() {
      const today = TODAY
      const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const count = async (query) => {
        const { count: value, error } = await query
        if (error) return 0
        return value || 0
      }
      const [
        missingDocs,
        expiredDocs,
        expiringDocs,
        expiredCerts,
        expiringCerts,
        openWarnings,
        pendingTimesheets,
        attendanceIssues,
        offboardingOpen,
        discrepancies,
      ] = await Promise.all([
        count(supabase.from('documents').select('id', { count: 'exact', head: true }).eq('status', 'missing').eq('is_blocking', true)),
        count(supabase.from('documents').select('id', { count: 'exact', head: true }).lt('expiry_date', today).neq('status', 'missing')),
        count(supabase.from('documents').select('id', { count: 'exact', head: true }).gte('expiry_date', today).lte('expiry_date', in30)),
        count(supabase.from('certifications').select('id', { count: 'exact', head: true }).lt('expiry_date', today)),
        count(supabase.from('certifications').select('id', { count: 'exact', head: true }).gte('expiry_date', today).lte('expiry_date', in30)),
        count(supabase.from('warnings').select('id', { count: 'exact', head: true }).not('status', 'in', '("closed","resolved")')),
        count(supabase.from('timesheet_headers').select('id', { count: 'exact', head: true }).or('hr_check_status.eq.pending,operations_check_status.eq.pending,final_approval_status.eq.pending,status.eq.pending')),
        count(supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('date', today).in('reason', ['absent_no_cert', 'unauthorised_absence', 'absent'])),
        count(supabase.from('offboarding').select('id', { count: 'exact', head: true }).is('file_closed_at', null)),
        count(supabase.from('attendance_conflicts').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
      ])

      if (cancelled) return
      const docIssues = missingDocs + expiredDocs
      const certIssues = expiredCerts
      const inboxTotal = docIssues + expiringDocs + certIssues + expiringCerts + openWarnings + pendingTimesheets
      setAlertDots({
        documents: docIssues > 0 ? 'danger' : expiringDocs > 0 ? 'warning' : 'neutral',
        certifications: certIssues > 0 ? 'danger' : expiringCerts > 0 ? 'warning' : 'neutral',
        inbox: inboxTotal > 0 ? 'danger' : 'neutral',
        warnings: openWarnings > 0 ? 'danger' : 'neutral',
        timesheets: pendingTimesheets > 0 ? 'warning' : 'neutral',
        attendance: attendanceIssues > 0 ? 'warning' : 'neutral',
        'offboarding-exit': offboardingOpen > 0 ? 'danger' : 'neutral',
        'timesheet-reconcile': discrepancies > 0 ? 'danger' : 'neutral',
      })
    }
    loadAlertDots().catch(() => {})
    return () => { cancelled = true }
  }, [])

  return (
    <div className="app-shell">
      <Sidebar alertDots={alertDots} />
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-title">{pageTitle}</span>
          </div>
          <div className="topbar-right">
            <a href="/" className="btn btn-ghost btn-sm">Switch Role</a>
          </div>
        </header>
        <main className="page-shell">{children}</main>
      </div>
    </div>
  )
}
