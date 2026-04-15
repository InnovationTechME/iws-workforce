'use client'
import { useState } from 'react'
import DualFileField from './fields/DualFileField'
import DateField from './fields/DateField'
import NotesField from './fields/NotesField'
import EIDMaskedInput from './fields/EIDMaskedInput'
import { saveOnboardingDoc } from '../../lib/onboardingService'

export default function EmiratesIDForm({ worker, template, existing, onCancel, onSaved }) {
  const [eidNumber, setEidNumber] = useState(existing?.eid_number || '')
  const [frontFile, setFrontFile] = useState(null)
  const [backFile, setBackFile] = useState(null)
  const [expiryDate, setExpiryDate] = useState(existing?.expiry_date || '')
  const [notes, setNotes] = useState(existing?.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    setError(null)
    if (!eidNumber.replace(/\D/g, '').length) { setError('Emirates ID / National ID number is required'); return }
    if (!expiryDate) { setError('Expiry date is required'); return }
    if (expiryDate <= new Date().toISOString().split('T')[0]) { setError('Expiry date must be in the future'); return }
    if (!frontFile && !existing?.front_file_url) { setError('Please select the front-side file'); return }
    if (!backFile && !existing?.back_file_url) { setError('Please select the back-side file'); return }
    setSaving(true)
    try {
      await saveOnboardingDoc(worker, 'emirates_id', {
        front_file: frontFile,
        back_file: backFile,
        eid_number: eidNumber,
        expiry_date: expiryDate,
        notes,
        ref: eidNumber.replace(/\s+/g, ''),
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
      <EIDMaskedInput value={eidNumber} onChange={setEidNumber} required />
      <DualFileField frontLabel="Front side *" backLabel="Back side *" frontFile={frontFile} backFile={backFile} onFrontChange={setFrontFile} onBackChange={setBackFile} required />
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
