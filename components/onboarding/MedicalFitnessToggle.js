'use client'
import { useState } from 'react'
import PassFailToggle from './fields/PassFailToggle'
import { setMedicalFitnessPass, setMedicalFitnessFail } from '../../lib/onboardingService'

export default function MedicalFitnessToggle({ worker, existing, onCancel, onSaved }) {
  const [result, setResult] = useState(existing?.medical_result || null)
  const [confirmFail, setConfirmFail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSave = async () => {
    setError(null)
    if (!result) { setError('Please select Pass or Fail'); return }
    if (result === 'fail' && !confirmFail) {
      setError('Please confirm the consequences before submitting a Fail')
      return
    }
    setSaving(true)
    try {
      if (result === 'pass') await setMedicalFitnessPass(worker)
      else                   await setMedicalFitnessFail(worker)
      onSaved(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 6, padding: '10px 12px', fontSize: 12, color: '#155e75' }}>
        Record the DHA medical fitness result for this worker. <strong>No file upload.</strong>
      </div>
      <PassFailToggle value={result} onChange={setResult} disabled={saving} />

      {result === 'fail' && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '10px 12px', fontSize: 12, color: '#991b1b' }}>
          <strong>Fail consequences:</strong> worker.status will be set to inactive, worker.medical_failed flag set, and an HR Inbox task will be created for Operations to review (visa cancellation, blacklist, refund eligibility). <strong>No automatic blacklist entry.</strong>
          <label style={{ display: 'flex', gap: 8, marginTop: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={confirmFail} onChange={e => setConfirmFail(e.target.checked)} />
            <span>I confirm — proceed with Fail</span>
          </label>
        </div>
      )}

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: '#dc2626' }}>⚠ {error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-teal btn-sm" onClick={handleSave} disabled={saving || !result}>
          {saving ? 'Saving…' : (result === 'fail' ? 'Record Fail' : 'Record Result')}
        </button>
      </div>
    </div>
  )
}
