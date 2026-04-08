export default function StatCard({ label, value, tone, helper }) {
  return (
    <div className="stat-card">
      <div className={`num${tone ? ' ' + tone : ''}`}>{value}</div>
      <div className="lbl">{label}</div>
      {helper && <div className="helper">{helper}</div>}
    </div>
  )
}
