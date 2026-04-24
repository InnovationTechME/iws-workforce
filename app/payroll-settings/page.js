'use client'
import { useEffect, useMemo, useState } from 'react'
import AppShell from '../../components/AppShell'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { supabase } from '../../lib/supabaseClient'
import { addPublicHoliday, getPublicHolidays, removePublicHoliday } from '../../lib/publicHolidayService'
import { formatDate } from '../../lib/utils'

export default function PayrollSettingsPage() {
  const currentYear = new Date().getFullYear()
  const [holidays, setHolidays] = useState([])
  const [ramadanHeaders, setRamadanHeaders] = useState([])
  const [showAddHoliday, setShowAddHoliday] = useState(false)
  const [hForm, setHForm] = useState({ date: '', name: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    setError('')
    try {
      const [holidayRows, ramadanResult] = await Promise.all([
        getPublicHolidays(),
        supabase
          .from('timesheet_headers')
          .select('id, client_name, month, year, month_label, status')
          .eq('ramadan_mode', true)
          .order('year', { ascending: false })
          .order('month', { ascending: false }),
      ])
      if (ramadanResult.error) throw ramadanResult.error
      setHolidays(holidayRows)
      setRamadanHeaders(ramadanResult.data || [])
    } catch (err) {
      console.error('Failed to load payroll settings', err)
      setError(err.message || 'Failed to load payroll settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddHoliday() {
    if (!hForm.date || !hForm.name.trim()) return
    setSaving(true)
    setError('')
    try {
      await addPublicHoliday(hForm)
      setHForm({ date: '', name: '' })
      setShowAddHoliday(false)
      await loadSettings()
    } catch (err) {
      console.error('Failed to add public holiday', err)
      setError(err.message || 'Failed to add public holiday')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveHoliday(holiday) {
    const ok = window.confirm(`Remove ${holiday.name} (${holiday.date}) from public holidays?`)
    if (!ok) return
    setSaving(true)
    setError('')
    try {
      await removePublicHoliday(holiday.id)
      await loadSettings()
    } catch (err) {
      console.error('Failed to remove public holiday', err)
      setError(err.message || 'Failed to remove public holiday')
    } finally {
      setSaving(false)
    }
  }

  const holidaysThisYear = useMemo(
    () => holidays.filter(h => Number(h.year) === currentYear),
    [holidays, currentYear]
  )
  const otherHolidays = useMemo(
    () => holidays.filter(h => Number(h.year) !== currentYear),
    [holidays, currentYear]
  )
  const ramadanActive = ramadanHeaders.length > 0

  return (
    <AppShell pageTitle="Payroll Settings">
      <PageHeader
        eyebrow="Payroll Settings"
        title="Public holidays & Ramadan mode"
        description="Manage the public holiday calendar used by timesheets and review Ramadan payroll mode where it is enabled on timesheet periods."
      />

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div style={{ background: ramadanActive ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : '#f8fafc', border: ramadanActive ? 'none' : '1.5px solid #e2e8f0', borderRadius: 12, padding: '20px 24px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: ramadanActive ? 'white' : '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            Ramadan Payroll Mode
            {ramadanActive && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>ACTIVE ON {ramadanHeaders.length} TIMESHEET{ramadanHeaders.length === 1 ? '' : 'S'}</span>}
          </div>
          {ramadanActive ? (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.7 }}>
              Ramadan mode is enabled on selected timesheet headers. Payroll will read those header flags when generating payroll lines.
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
              No timesheet periods currently have Ramadan mode enabled. Use the timesheet grid for the relevant month/client to switch it on.
            </div>
          )}
        </div>
        <a className="btn btn-primary" href="/timesheets/grid" style={{ background: '#7c3aed', borderColor: '#7c3aed', textDecoration: 'none' }}>
          Open Timesheet Grid
        </a>
      </div>

      {ramadanActive && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-header"><div><h2>Ramadan-enabled timesheets</h2><p>These headers affect payroll OT threshold for their period.</p></div></div>
          <div className="table-wrap"><table>
            <thead><tr><th>Period</th><th>Client</th><th>Status</th></tr></thead>
            <tbody>{ramadanHeaders.map(h => (
              <tr key={h.id}>
                <td style={{ fontSize: 13, fontWeight: 600 }}>{h.month_label || `${h.month}/${h.year}`}</td>
                <td style={{ fontSize: 13 }}>{h.client_name || 'Unknown client'}</td>
                <td><StatusBadge label={h.status || 'draft'} tone={h.status === 'hr_approved' ? 'success' : 'warning'} /></td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="panel">
          <div className="panel-header">
            <div><h2>Configured public holidays</h2><p>Stored in Supabase and used by timesheet calculations.</p></div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddHoliday(true)} disabled={saving}>+ Add Holiday</button>
          </div>
          {showAddHoliday && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="form-field" style={{ margin: 0 }}><label className="form-label">Date</label><input className="form-input" type="date" value={hForm.date} onChange={e => setHForm({ ...hForm, date: e.target.value })} /></div>
                <div className="form-field" style={{ flex: 1, margin: 0, minWidth: 220 }}><label className="form-label">Holiday name</label><input className="form-input" value={hForm.name} placeholder="e.g. Eid Al Fitr Day 1" onChange={e => setHForm({ ...hForm, name: e.target.value })} /></div>
                <button className="btn btn-teal btn-sm" onClick={handleAddHoliday} disabled={saving}>{saving ? 'Saving...' : 'Add'}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddHoliday(false)} disabled={saving}>Cancel</button>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ fontSize: 13, color: 'var(--hint)', padding: '16px 0' }}>Loading payroll settings...</div>
          ) : holidaysThisYear.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--hint)', padding: '16px 0' }}>No public holidays configured for {currentYear}.</div>
          ) : (
            <div className="table-wrap"><table>
              <thead><tr><th>Date</th><th>Holiday</th><th>Year</th><th></th></tr></thead>
              <tbody>{holidaysThisYear.map(h => (
                <tr key={h.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: 'var(--teal)' }}>{h.date}</td>
                  <td style={{ fontSize: 13, fontWeight: 500 }}>{h.name}</td>
                  <td><StatusBadge label={String(h.year)} tone="info" /></td>
                  <td style={{ textAlign: 'right' }}><button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleRemoveHoliday(h)} disabled={saving}>Remove</button></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header"><div><h2>Calendar summary</h2><p>What payroll will read.</p></div></div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>This year</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--teal)' }}>{holidaysThisYear.length}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>All years</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{holidays.length}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Ramadan headers</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: ramadanActive ? '#7c3aed' : '#64748b' }}>{ramadanHeaders.length}</div>
            </div>
          </div>
        </div>
      </div>

      {otherHolidays.length > 0 && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-header"><div><h2>Other configured years</h2><p>These are available when payroll/timesheets are opened for their year.</p></div></div>
          <div className="table-wrap"><table>
            <thead><tr><th>Date</th><th>Holiday</th><th>Year</th><th></th></tr></thead>
            <tbody>{otherHolidays.map(h => (
              <tr key={h.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#64748b' }}>{h.date}</td>
                <td style={{ fontSize: 13, fontWeight: 500 }}>{h.name}</td>
                <td><StatusBadge label={String(h.year)} tone="info" /></td>
                <td style={{ textAlign: 'right' }}><button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleRemoveHoliday(h)} disabled={saving}>Remove</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>
      )}

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-header"><div><h2>Current payroll rules in effect</h2></div></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
          {[
            ['OT threshold', ramadanActive ? 'Per enabled timesheet' : '8 hours standard', ramadanActive ? '#7c3aed' : 'var(--teal)'],
            ['Rest day', 'Sunday default; per-worker override', '#d97706'],
            ['OT1 rate', '125% of hourly rate', 'var(--teal)'],
            ['Public holiday rate', '150% of hourly rate', '#d97706'],
            ['Flat workers', 'No OT premium; flat rate only', '#64748b'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
