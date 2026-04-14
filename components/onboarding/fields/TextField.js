'use client'

export default function TextField({ label, value, onChange, required = false, placeholder = '', as = 'input' }) {
  if (as === 'select') {
    return (
      <div className="form-field">
        <label className="form-label" style={{ fontSize: 11 }}>{label}{required && ' *'}</label>
        <select
          className="form-select"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Select…</option>
          {/* caller supplies options via children on a <select> pattern; since
              this component uses `as='select'` but no children here, callers
              should use <select> directly if custom options are needed */}
        </select>
      </div>
    )
  }
  return (
    <div className="form-field">
      <label className="form-label" style={{ fontSize: 11 }}>{label}{required && ' *'}</label>
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
