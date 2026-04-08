'use client'
export default function LetterViewer({ html, onClose, refNumber }) {
  const handlePrint = () => {
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 500)
  }
  const handleDownload = () => {
    const blob = new Blob([html], { type:'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${refNumber}.html`
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:9999,display:'flex',flexDirection:'column'}}>
      <div style={{background:'#1e293b',padding:'10px 20px',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
        <span style={{color:'white',fontWeight:600,fontSize:13,fontFamily:'monospace'}}>{refNumber}</span>
        <button className="btn btn-teal btn-sm" onClick={handlePrint}>🖨 Print / Save as PDF</button>
        <button className="btn btn-secondary btn-sm" onClick={handleDownload}>⬇ Download HTML</button>
        <div style={{flex:1}} />
        <button className="btn btn-ghost btn-sm" style={{color:'white'}} onClick={onClose}>✕ Close</button>
      </div>
      <div style={{flex:1,overflow:'auto',background:'#64748b',padding:32,display:'flex',justifyContent:'center',alignItems:'flex-start'}}>
        <iframe
          srcDoc={html}
          style={{width:'210mm',minHeight:'297mm',background:'white',border:'none',boxShadow:'0 8px 32px rgba(0,0,0,0.4)',borderRadius:4}}
          title="Letter Preview"
        />
      </div>
    </div>
  )
}
