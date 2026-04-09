'use client'
import { useState, useEffect } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import ApprovalsDashboard from '../../components/ApprovalsDashboard'

export default function ApprovalsPage() {
  return (
    <AppShell pageTitle="Approvals">
      <PageHeader eyebrow="Approvals" title="Pending approvals" description="Review and approve pending timesheets, payroll, warnings, and terminations." />
      <ApprovalsDashboard />
    </AppShell>
  )
}
