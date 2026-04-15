// §5.3.6 / §5.3.7 — Contract Worker hourly rate is a fixed dropdown
// (9–22 AED/hr, integers only). No free-text entry. Export the list so
// form-level validation can reject values outside it (defence in depth
// even though the UI is a <select>).
export const HOURLY_RATES = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]

export function isValidHourlyRate(value) {
  const n = Number(value)
  return Number.isInteger(n) && HOURLY_RATES.includes(n)
}

export default function HourlyRateField({ value, onChange, required = false, label = 'Hourly rate (AED)' }) {
  return (
    <div className="form-field">
      <label className="form-label">{label}{required ? ' *' : ''}</label>
      <select
        className="form-select"
        value={value === null || value === undefined ? '' : String(value)}
        onChange={e => onChange(e.target.value)}>
        <option value="">Select hourly rate</option>
        {HOURLY_RATES.map(r => (
          <option key={r} value={r}>AED {r}/hr</option>
        ))}
      </select>
    </div>
  )
}
