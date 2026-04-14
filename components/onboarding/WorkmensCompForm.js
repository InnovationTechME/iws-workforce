'use client'
import { useState } from 'react'
import FileField from './fields/FileField'
import DateField from './fields/DateField'
import TextField from './fields/TextField'
import NotesField from './fields/NotesField'
import NameHighlightConfirm from './fields/NameHighlightConfirm'
import { saveOnboardingDoc } from '../../lib/onboardingService'

export default function WorkmensCompForm({ worker, template, existing, onCancel, onSaved }) {
  const [file, setFile] = useState(null)
  const [provider, setProvider] = useState(existing?.provider || '')
  const [policyReference, setPolicyReference] = useState(existing?.policy_reference || '')
  const [policyNumber, setPolicyNumber] = useState(existing?.policy_number || '')
  const [expiryDate, setExpiryDate] = useState(existing?.expiry_date || '')
  const [highlight, setHighlight] = useState(!!existing?.highlighted_name_confirmed)
  const [notes, setNotes] = useState(existing?.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    setError(null)
    if (!provider.trim()) { setError('Provider is required'); return }
    if (!policyReference.trim() && !policyNumber.trim()) { setError('Policy reference or policy number is required'); return }
    if (!expiryDate) { setError('Expiry date is required'); return }
    if (expiryDate <= new Date().toISOString().split('T')[0]) { setError('Expiry date must be in the future'); return }
    if (!file && !existing?.file_url) { setError('Please select a file'); return }
    if (!highlight) { setError("You must confirm the worker's name is highlighted"); return }
    setSaving(true)
    try {
      await saveOnboardingDoc(worker, 'workmen_compensation', {
        files: file,
        provider: provider.trim(),
        policy_reference: policyReference.trim(),
        policy_number: policyNumber.trim(),
        expiry_date: expiryDate,
        notes,
        highlighted_name_confirmed: highlight,
        ref: policyNumber.trim() || policyReference.trim(),
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
      <FileField label="Workmen's Compensation file" file={file} onChange={setFile} required />
      <TextField label="Provider" value={provider} onChange={setProvider} required placeholder="e.g. AXA, Oman Insurance" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <TextField label="Policy reference" value={policyReference} onChange={setPolicyReference} />
        <TextField label="Policy number"    value={policyNumber}    onChange={setPolicyNumber} />
      </div>
      <DateField label="Expiry date" value={expiryDate} onChange={setExpiryDate} required futureOnly />
      <NameHighlightConfirm checked={highlight} onChange={setHighlight} />
      <NotesField value={notes} onChange={setNotes} />
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#dc2626' }}>⚠ {error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-teal btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Uploading…' : 'Save Document'}</button>
      </div>
    </div>
  )
}
