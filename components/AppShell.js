'use client'
import Sidebar from './Sidebar'
import { getInboxItems } from '../lib/mockStore'

export default function AppShell({ children, pageTitle }) {
  let alertDots = {}
  try {
    const inbox = getInboxItems()
    const docIssues = inbox.expiredDocs.length + inbox.missingDocs.length
    const certIssues = inbox.expiredCerts.length
    const totalInbox = Object.values(inbox).reduce((sum, arr) => sum + arr.length, 0)
    alertDots = {
      documents: docIssues > 0 ? 'danger' : inbox.expiringDocs.length > 0 ? 'warning' : 'neutral',
      certifications: certIssues > 0 ? 'danger' : inbox.expiringCerts.length > 0 ? 'warning' : 'neutral',
      inbox: totalInbox > 0 ? 'danger' : 'neutral',
      warnings: inbox.openWarnings.length > 0 ? 'danger' : 'neutral',
      timesheets: inbox.pendingTimesheets.length > 0 ? 'warning' : 'neutral',
    }
  } catch(e) {}
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
