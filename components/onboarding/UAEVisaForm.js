'use client'
import { useState } from 'react'
import FileField from './fields/FileField'
import DateField from './fields/DateField'
import TextField from './fields/TextField'
import NotesField from './fields/NotesField'
import { saveOnboardingDoc } from '../../lib/onboardingService'

const VISA_TYPES = ['Employment', 'Residence', 'Dependent', 'Mission', 'Visit']
const EMIRATES = ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah']
const DEFAULT_SPONSOR = 'Innovation Technologies LLC O.P.C.'

export default function UAEVisaForm({ worker, template, existing, onCancel, onSaved }) {
  const [file, setFile] = useState(null)
  const [visaNumber, setVisaNumber] = useState(existing?.visa_number || '')
  const [visaType, setVisaType] = useState(existing?.visa_type || 'Employment')
  const [sponsor, setSponsor] = useState(existing?.sponsor || DEFAULT_SPONSOR)
  const [issuingEmirate, setIssuingEmirate] = useState(existing?.issuing_emirate || 'Abu Dhabi')
  const [issueDate, setIssueDate] = useState(existing?.issue_date || '')
  const [expiryDate, setExpiryDate] = useState(existing?.expiry_date || '')
  const [notes, setNotes] = useState(existing?.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    setError(null)
    if (!visaNumber.trim()) { setError('Visa number is required'); return }
    if (!expiryDate) { setError('Expiry date is required'); return }
    if (expiryDate <= new Date().toISOString().split('T')[0]) { setError('Expiry date must be in the future'); return }
    if (!file && !existing?.file_url) { setError('Please select a file'); return }
    setSaving(true)
    try {
      await saveOnboardingDoc(worker, 'uae_visa', {
        files: file,
        visa_number: visaNumber.trim(),
        visa_type: visaType,
        sponsor: sponsor.trim(),
        issuing_emirate: issuingEmirate,
        issue_date: issueDate,
        expiry_date: expiryDate,
        notes,
        ref: visaNumber.trim(),
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
      <FileField label="UAE Visa file" file={file} onChange={setFile} required />
      <TextField label="Visa number" value={visaNumber} onChange={setVisaNumber} required placeholder="e.g. 101/2026/XXXXXXX" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-field">
          <label className="form-label" style={{ fontSize: 11 }}>Visa type *</label>
          <select className="form-select" value={visaType} onChange={e => setVisaType(e.target.value)}>
            {VISA_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label" style={{ fontSize: 11 }}>Issuing emirate *</label>
          <select className="form-select" value={issuingEmirate} onChange={e => setIssuingEmirate(e.target.value)}>
            {EMIRATES.map(em => <option key={em} value={em}>{em}</option>)}
          </select>
        </div>
      </div>
      <TextField label="Sponsor" value={sponsor} onChange={setSponsor} placeholder={DEFAULT_SPONSOR} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <DateField label="Issue date" value={issueDate} onChange={setIssueDate} />
        <DateField label="Expiry date" value={expiryDate} onChange={setExpiryDate} required futureOnly />
      </div>
      <NotesField value={notes} onChange={setNotes} />
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#dc2626' }}>⚠ {error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-teal btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Uploading…' : 'Save Document'}</button>
      </div>
    </div>
  )
}
