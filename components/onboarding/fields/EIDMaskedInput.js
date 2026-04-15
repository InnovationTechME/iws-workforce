'use client'

function formatEID(raw) {
  const digits = (raw || '').replace(/\D/g, '').slice(0, 15)
  // Target mask: XXX-XXXX-XXXXXXX-X (3-4-7-1)
  const p1 = digits.slice(0, 3)
  const p2 = digits.slice(3, 7)
  const p3 = digits.slice(7, 14)
  const p4 = digits.slice(14, 15)
  return [p1, p2, p3, p4].filter(Boolean).join('-')
}

export default function EIDMaskedInput({ value, onChange, required = false }) {
  return (
    <div className="form-field">
      <label className="form-label" style={{ fontSize: 11 }}>Emirates ID / National ID number{required && ' *'}</label>
      <input
        type="text"
        className="form-input"
        value={value || ''}
        onChange={e => onChange(formatEID(e.target.value))}
        placeholder="784-XXXX-XXXXXXX-X"
        inputMode="numeric"
      />
      <div style={{ fontSize: 10, color: 'var(--hint)', marginTop: 2 }}>15 digits, masked automatically</div>
    </div>
  )
}
