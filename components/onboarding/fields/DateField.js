'use client'

const todayStr = () => new Date().toISOString().split('T')[0]
const tomorrowStr = () => new Date(Date.now() + 86400000).toISOString().split('T')[0]

export default function DateField({ label, value, onChange, required = false, futureOnly = false, pastAllowed = true }) {
  const min = futureOnly ? tomorrowStr() : undefined
  const max = !pastAllowed ? undefined : undefined
  const invalid = futureOnly && value && value <= todayStr()
  return (
    <div className="form-field">
      <label className="form-label" style={{ fontSize: 11 }}>{label}{required && ' *'}</label>
      <input
        type="date"
        className="form-input"
        value={value || ''}
        min={min}
        max={max}
        onChange={e => onChange(e.target.value)}
        style={invalid ? { borderColor: '#dc2626' } : {}}
      />
      {invalid && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>Must be a future date</div>}
    </div>
  )
}
