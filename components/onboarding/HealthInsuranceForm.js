'use client'
import { useState } from 'react'
import FileField from './fields/FileField'
import DateField from './fields/DateField'
import TextField from './fields/TextField'
import NotesField from './fields/NotesField'
import { saveOnboardingDoc } from '../../lib/onboardingService'

const COVERAGE_TYPES = ['Basic', 'Enhanced', 'Comprehensive']

export default function HealthInsuranceForm({ worker, template, existing, onCancel, onSaved }) {
  const [file, setFile] = useState(null)
  const [policyNumber, setPolicyNumber] = useState(existing?.policy_number || '')
  const [provider, setProvider] = useState(existing?.provider || '')
  const [coverageType, setCoverageType] = useState(existing?.coverage_type || 'Basic')
  const [expiryDate, setExpiryDate] = useState(existing?.expiry_date || '')
  const [notes, setNotes] = useState(existing?.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    setError(null)
    if (!policyNumber.trim()) { setError('Policy number is required'); return }
    if (!provider.trim()) { setError('Provider is required'); return }
    if (!expiryDate) { setError('Expiry date is required'); return }
    if (expiryDate <= new Date().toISOString().split('T')[0]) { setError('Expiry date must be in the future'); return }
    if (!file && !existing?.file_url) { setError('Please select a file'); return }
    setSaving(true)
    try {
      await saveOnboardingDoc(worker, 'health_insurance', {
        files: file,
        policy_number: policyNumber.trim(),
        provider: provider.trim(),
        coverage_type: coverageType,
        expiry_date: expiryDate,
        notes,
        ref: policyNumber.trim(),
        label: template.label,
        is_blocking: template.is_blocking,
      })
      onSaved()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <FileField label="Health insurance file" file={file} onChange={setFile} required />
      <TextField label="Policy number" value={policyNumber} onChange={setPolicyNumber} required />
      <TextField label="Provider" value={provider} onChange={setProvider} required placeholder="e.g. AXA, Daman, Oman Insurance" />
      <div className="form-field">
        <label className="form-label" style={{ fontSize: 11 }}>Coverage type *</label>
        <select className="form-select" value={coverageType} onChange={e => setCoverageType(e.target.value)}>
          {COVERAGE_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <DateField label="Expiry date" value={expiryDate} onChange={setExpiryDate} required futureOnly />
      <NotesField value={notes} onChange={setNotes} />
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#dc2626' }}>⚠ {error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-teal btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Uploading…' : 'Save Document'}</button>
      </div>
    </div>
  )
}
