'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import { supabase } from '../lib/supabaseClient'
import { TODAY } from '../lib/utils'
import { TIMESHEET_PENDING_STATUSES } from '../lib/inboxService'
import { setRole } from '../lib/mockAuth'

function withTimeout(promise, timeoutMs = 3500) {
  let timeoutId
  const timeout = new Promise(resolve => {
    timeoutId = setTimeout(() => resolve({ count: 0, error: new Error('alert query timed out') }), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}

export default function AppShell({ children, pageTitle }) {
  const [alertDots, setAlertDots] = useState({})
  const [authChecked, setAuthChecked] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      const session = data.session
      if (!session) {
        router.replace('/')
        return
      }
      setRole(session.user?.app_metadata?.role || 'owner')
      setAuthChecked(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/')
      else {
        setRole(session.user?.app_metadata?.role || 'owner')
        setAuthChecked(true)
      }
    })
    return () => {
      cancelled = true
      listener?.subscription?.unsubscribe()
    }
  }, [router])

  useEffect(() => {
    if (!authChecked) return
    let cancelled = false
    async function loadAlertDots() {
      const today = TODAY
      const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const count = async (query) => {
        const { count: value, error } = await withTimeout(query)
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
        count(supabase.from('timesheet_headers').select('id', { count: 'exact', head: true }).in('status', TIMESHEET_PENDING_STATUSES)),
        count(supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('date', today).in('reason', ['absent_no_cert', 'unauthorised_absence', 'absent'])),
        count(supabase.from('offboarding').select('id', { count: 'exact', head: true }).is('file_closed_at', null)),
        count(supabase.from('timesheet_discrepancies').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
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
  }, [authChecked])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (!authChecked) {
    return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)'}}>Checking secure session...</div>
  }

  return (
    <div className="app-shell">
      <Sidebar alertDots={alertDots} />
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-title">{pageTitle}</span>
          </div>
          <div className="topbar-right">
            <button type="button" onClick={handleSignOut} className="btn btn-ghost btn-sm">Sign out</button>
          </div>
        </header>
        <main className="page-shell">{children}</main>
      </div>
    </div>
  )
}
