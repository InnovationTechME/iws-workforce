'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export const EXPIRY_REQUIRED = ['uae_visa', 'emirates_id', 'passport_copy', 'health_insurance', 'workmen_compensation', 'medical_fitness', 'labour_card', 'iloe_certificate']
export const NO_EXPIRY = ['passport_photo', 'offer_letter', 'employment_contract', 'worker_policy_manual', 'passport_safekeeping']

const todayStr = () => new Date().toISOString().split('T')[0]
const tomorrowStr = () => new Date(Date.now() + 86400000).toISOString().split('T')[0]

export function validateUploadForm(file, expiryDate, highlightConfirmed, docType) {
  const errors = []
  if (!file) errors.push('Please select a file')
  if (EXPIRY_REQUIRED.includes(docType)) {
    if (!expiryDate) errors.push('Expiry date is required for this document')
    else if (expiryDate <= todayStr()) errors.push('Expiry date must be a future date')
  }
  if (docType === 'workmen_compensation' && !highlightConfirmed) {
    errors.push("You must confirm the worker's name is highlighted")
  }
  return errors
}

export async function saveDocument(workerId, docType, docLabel, isBlocking, file, expiryDate, notes, highlightConfirmed) {
  const { error } = await supabase
    .from('documents')
    .upsert({
      worker_id: workerId,
      doc_type: docType,
      label: docLabel,
      status: 'valid',
      is_blocking: isBlocking,
      file_url: URL.createObjectURL(file),
      expiry_date: expiryDate || null,
      notes: notes || null,
      uploaded_at: new Date().toISOString(),
      highlighted_name_confirmed: docType === 'workmen_compensation' ? highlightConfirmed : null,
      doc_subtype: docType === 'workmen_compensation' ? 'highlighted_page' : null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'worker_id,doc_type' })
  if (error) throw new Error(error.message)
}

export default function DocumentUploadForm({ docType, docLabel, isBlocking, workerId, onCancel, onSaved }) {
  const [file, setFile] = useState(null)
  const [expiry, setExpiry] = useState('')
  const [notes, setNotes] = useState('')
  const [highlight, setHighlight] = useState(false)
  const [errors, setErrors] = useState([])
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)

  const needsExpiry = EXPIRY_REQUIRED.includes(docType)
  const isWC = docType === 'workmen_compensation'

  const handleSave = async () => {
    const errs = validateUploadForm(file, expiry, highlight, docType)
    setErrors(errs)
    setSaveError(null)
    if (errs.length) return
    setSaving(true)
    try {
      await saveDocument(workerId, docType, docLabel, isBlocking, file, expiry, notes, highlight)
      onSaved()
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const expiryInvalid = needsExpiry && expiry && expiry <= todayStr()

  return (
    <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:14,marginTop:6,display:'flex',flexDirection:'column',gap:10}}>
      <div className="form-field">
        <label className="form-label" style={{fontSize:11}}>Select file *</label>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="form-input" onChange={e => setFile(e.target.files?.[0] || null)} />
        {file && <div style={{fontSize:11,color:'#0d9488',marginTop:4}}>📎 {file.name}</div>}
      </div>

      {needsExpiry && (
        <div className="form-field">
          <label className="form-label" style={{fontSize:11}}>Expiry date *</label>
          <input type="date" className="form-input" value={expiry} min={tomorrowStr()} onChange={e => setExpiry(e.target.value)} style={expiryInvalid ? {borderColor:'#dc2626'} : {}} />
          {expiryInvalid && <div style={{fontSize:11,color:'#dc2626',marginTop:4}}>Expiry date must be a future date</div>}
        </div>
      )}

      <div className="form-field">
        <label className="form-label" style={{fontSize:11}}>Notes (optional)</label>
        <input type="text" className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. renewal reference, issuing authority" />
      </div>

      {isWC && (
        <label style={{display:'flex',alignItems:'flex-start',gap:8,cursor:'pointer',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:6,padding:'8px 10px'}}>
          <input type="checkbox" checked={highlight} onChange={e => setHighlight(e.target.checked)} style={{marginTop:2}} />
          <span style={{fontSize:12,color:'#92400e'}}>I confirm the worker&rsquo;s name is highlighted on this document</span>
        </label>
      )}

      {errors.length > 0 && (
        <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:6,padding:'8px 10px'}}>
          {errors.map(e => <div key={e} style={{fontSize:11,color:'#dc2626'}}>⚠ {e}</div>)}
        </div>
      )}
      {saveError && (
        <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:6,padding:'8px 10px'}}>
          <div style={{fontSize:11,color:'#dc2626'}}>Upload failed: {saveError}</div>
        </div>
      )}

      <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
        <button className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-teal btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Document'}</button>
      </div>
    </div>
  )
}
