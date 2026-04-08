export default function StatusBadge({ label, tone = 'neutral' }) {
  return <span className={`badge ${tone}`}>{label}</span>
}
