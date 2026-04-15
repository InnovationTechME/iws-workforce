'use client'
import { useState } from 'react'
import FileField from './fields/FileField'
import DateField from './fields/DateField'
import TextField from './fields/TextField'
import NotesField from './fields/NotesField'
import { saveOnboardingDoc } from '../../lib/onboardingService'

export default function PassportCopyForm({ worker, template, existing, onCancel, onSaved }) {
  const [mode, setMode] = useState('pdf')          // 'pdf' | 'images'
  const [pdfFile, setPdfFile] = useState(null)
  const [imageFiles, setImageFiles] = useState([])
  const [passportNumber, setPassportNumber] = useState(existing?.passport_number || '')
  const [issuingCountry, setIssuingCountry] = useState(existing?.issuing_country || '')
  const [issueDate, setIssueDate] = useState(existing?.issue_date || '')
  const [expiryDate, setExpiryDate] = useState(existing?.expiry_date || '')
  const [notes, setNotes] = useState(existing?.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    setError(null)
    if (!passportNumber.trim()) { setError('Passport number is required'); return }
    if (!expiryDate) { setError('Expiry date is required'); return }
    if (expiryDate <= new Date().toISOString().split('T')[0]) { setError('Expiry date must be in the future'); return }
    if (mode === 'pdf' && !pdfFile && !existing?.file_url) { setError('Please select a PDF'); return }
    if (mode === 'images' && imageFiles.length === 0 && !existing?.file_url) { setError('Please select at least one image'); return }
    setSaving(true)
    try {
      await saveOnboardingDoc(worker, 'passport_copy', {
        files: mode === 'pdf' ? pdfFile : imageFiles,
        passport_number: passportNumber.trim(),
        issuing_country: issuingCountry.trim(),
        issue_date: issueDate,
        expiry_date: expiryDate,
        notes,
        ref: passportNumber.trim(),
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
      <div style={{ display: 'flex', gap: 10 }}>
        <label style={{ fontSize: 12, cursor: 'pointer' }}>
          <input type="radio" checked={mode === 'pdf'} onChange={() => setMode('pdf')} /> Single PDF
        </label>
        <label style={{ fontSize: 12, cursor: 'pointer' }}>
          <input type="radio" checked={mode === 'images'} onChange={() => setMode('images')} /> Multiple images
        </label>
      </div>

      {mode === 'pdf' && (
        <FileField label="Passport PDF" accept=".pdf,.PDF" file={pdfFile} onChange={setPdfFile} required />
      )}
      {mode === 'images' && (
        <div className="form-field">
          <label className="form-label" style={{ fontSize: 11 }}>Passport page images *</label>
          <input
            type="file"
            className="form-input"
            accept=".jpg,.jpeg,.png"
            multiple
            onChange={e => setImageFiles(Array.from(e.target.files || []))}
          />
          {imageFiles.length > 0 && (
            <div style={{ fontSize: 11, color: '#0d9488', marginTop: 4 }}>📎 {imageFiles.length} image{imageFiles.length > 1 ? 's' : ''} selected</div>
          )}
        </div>
      )}

      <TextField label="Passport number" value={passportNumber} onChange={setPassportNumber} required placeholder="e.g. A12345678" />
      <TextField label="Issuing country" value={issuingCountry} onChange={setIssuingCountry} placeholder="e.g. Pakistan" />
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
