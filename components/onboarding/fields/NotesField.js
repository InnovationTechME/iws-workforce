'use client'

export default function NotesField({ value, onChange, placeholder = 'e.g. renewal reference, issuing authority' }) {
  return (
    <div className="form-field">
      <label className="form-label" style={{ fontSize: 11 }}>Notes (optional)</label>
      <input
        type="text"
        className="form-input"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}
