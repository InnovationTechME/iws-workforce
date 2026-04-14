'use client'

export default function FileField({ label, accept = '.pdf,.jpg,.jpeg,.png', file, onChange, required = false }) {
  return (
    <div className="form-field">
      <label className="form-label" style={{ fontSize: 11 }}>{label}{required && ' *'}</label>
      <input
        type="file"
        accept={accept}
        className="form-input"
        onChange={e => onChange(e.target.files?.[0] || null)}
      />
      {file && <div style={{ fontSize: 11, color: '#0d9488', marginTop: 4 }}>📎 {file.name}</div>}
    </div>
  )
}
