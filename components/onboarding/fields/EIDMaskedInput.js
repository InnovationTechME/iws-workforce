'use client'

import { useState } from 'react'

export const EID_REGEX = /^784-\d{4}-\d{7}-\d$/

function formatEID(raw) {
  const digits = (raw || '').replace(/\D/g, '').slice(0, 15)
  // Target mask: XXX-XXXX-XXXXXXX-X (3-4-7-1)
  const p1 = digits.slice(0, 3)
  const p2 = digits.slice(3, 7)
  const p3 = digits.slice(7, 14)
  const p4 = digits.slice(14, 15)
  return [p1, p2, p3, p4].filter(Boolean).join('-')
}

export function isValidEID(value) {
  if (!value) return false
  return EID_REGEX.test(value)
}

export default function EIDMaskedInput({ value, onChange, required = false, label }) {
  const [touched, setTouched] = useState(false)
  const digits = (value || '').replace(/\D/g, '')
  const showError = touched && (required || digits.length > 0) && !isValidEID(value)
  const errorMsg = digits.length === 0
    ? 'Emirates ID is required'
    : digits.length < 15
      ? 'Emirates ID must be 15 digits'
      : !/^784/.test(digits)
        ? 'Emirates ID must start with 784'
        : 'Invalid Emirates ID format'

  return (
    <div className="form-field">
      <label className="form-label" style={{ fontSize: 11 }}>{label || 'Emirates ID / National ID number'}{required && ' *'}</label>
      <input
        type="text"
        className="form-input"
        value={value || ''}
        onChange={e => onChange(formatEID(e.target.value))}
        onBlur={() => setTouched(true)}
        placeholder="784-XXXX-XXXXXXX-X"
        inputMode="numeric"
        style={showError ? { borderColor: 'var(--danger)' } : {}}
      />
      {showError
        ? <div style={{ fontSize: 10, color: 'var(--danger)', marginTop: 2 }}>⚠ {errorMsg}</div>
        : <div style={{ fontSize: 10, color: 'var(--hint)', marginTop: 2 }}>Format: 784-XXXX-XXXXXXX-X (15 digits)</div>}
    </div>
  )
}
