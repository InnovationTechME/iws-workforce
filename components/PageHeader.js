export default function PageHeader({ eyebrow, title, description, actions, meta, media }) {
  return (
    <div className="page-header">
      <div style={{display:'flex',alignItems:'center',gap:16}}>
        {media && <div style={{flexShrink:0}}>{media}</div>}
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {description && <p className="page-header-meta">{description}</p>}
          {meta && <div style={{marginTop:6}}>{meta}</div>}
        </div>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}
