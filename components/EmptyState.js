export default function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <div style={{fontSize:32,marginBottom:12}}>—</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div style={{marginTop:16}}>{action}</div>}
    </div>
  )
}
