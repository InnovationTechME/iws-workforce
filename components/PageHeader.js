export default function PageHeader({ eyebrow, title, description, actions, meta }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-header-meta">{description}</p>}
        {meta && <div style={{marginTop:6}}>{meta}</div>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}
