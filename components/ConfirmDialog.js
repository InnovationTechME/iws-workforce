'use client'
export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', confirmTone = 'btn-primary', onConfirm, onCancel }) {
  return (
    <div className="drawer-backdrop" onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{background:'#fff',borderRadius:12,padding:24,width:'min(420px,90vw)',margin:'auto',border:'0.5px solid var(--border)',boxShadow:'0 20px 60px rgba(15,23,42,.15)',position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)'}}>
        <h3 style={{fontSize:15,fontWeight:600,marginBottom:8}}>{title}</h3>
        <p style={{fontSize:13,color:'var(--muted)',marginBottom:20}}>{message}</p>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={`btn ${confirmTone}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
