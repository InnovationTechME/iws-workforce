'use client'
import { useState } from 'react'
import FileField from './fields/FileField'
import DateField from './fields/DateField'
import NotesField from './fields/NotesField'
import { saveOnboardingDoc } from '../../lib/onboardingService'

export default function LabourCardForm({ worker, template, existing, onCancel, onSaved }) {
  const [file, setFile] = useState(null)
  const [expiryDate, setExpiryDate] = useState(existing?.expiry_date || '')
  const [notes, setNotes] = useState(existing?.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    setError(null)
    if (!file && !existing?.file_url) { setError('Please select a file'); return }
    setSaving(true)
    try {
      await saveOnboardingDoc(worker, 'labour_card', {
        files: file,
        expiry_date: expiryDate || null,
        notes,
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
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#92400e' }}>
        ⚠ Warning only — worker can be activated without it.
      </div>
      <FileField label="Labour Card / MOHRE file" file={file} onChange={setFile} required />
      <DateField label="Expiry date" value={expiryDate} onChange={setExpiryDate} futureOnly />
      <NotesField value={notes} onChange={setNotes} />
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#dc2626' }}>⚠ {error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-teal btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Uploading…' : 'Save Document'}</button>
      </div>
    </div>
  )
}
