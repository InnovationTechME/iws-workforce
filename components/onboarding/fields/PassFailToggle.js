'use client'

export default function PassFailToggle({ value, onChange, disabled = false }) {
  const base = { flex: 1, padding: '10px 14px', fontSize: 13, fontWeight: 700, borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer', border: '1.5px solid', transition: 'all .1s' }
  const passStyle = value === 'pass'
    ? { ...base, background: '#16a34a', color: '#fff', borderColor: '#16a34a' }
    : { ...base, background: '#fff', color: '#16a34a', borderColor: '#86efac' }
  const failStyle = value === 'fail'
    ? { ...base, background: '#dc2626', color: '#fff', borderColor: '#dc2626' }
    : { ...base, background: '#fff', color: '#dc2626', borderColor: '#fecaca' }
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <button type="button" style={passStyle} disabled={disabled} onClick={() => onChange('pass')}>✓ Pass</button>
      <button type="button" style={failStyle} disabled={disabled} onClick={() => onChange('fail')}>✕ Fail</button>
    </div>
  )
}
