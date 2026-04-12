'use client'
import { useRef } from 'react'
export default function LetterViewer({ html, onClose, refNumber }) {
  const iframeRef = useRef(null)
  const handlePrint = () => {
    const iframe = iframeRef.current
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    }
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
  const isPayslip = refNumber?.startsWith('IT-PS-')
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:9999,display:'flex',flexDirection:'column'}}>
      <div className="no-print" style={{background:'#1e293b',padding:'10px 20px',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
        <span style={{color:'white',fontWeight:600,fontSize:13,fontFamily:'monospace'}}>{refNumber}</span>
        <button className="btn btn-teal btn-sm no-print" onClick={handlePrint}>Print / Save as PDF</button>
        <button className="btn btn-secondary btn-sm no-print" onClick={handleDownload}>Download HTML</button>
        <div style={{flex:1}} />
        <button className="btn btn-ghost btn-sm no-print" style={{color:'white'}} onClick={onClose}>Close</button>
      </div>
      <div style={{flex:1,overflow:'auto',background:'#64748b',padding:32,display:'flex',justifyContent:'center',alignItems:'flex-start'}}>
        <iframe
          ref={iframeRef}
          srcDoc={html}
          style={{width: isPayslip ? '148mm' : '210mm', minHeight: isPayslip ? '210mm' : '297mm', background:'white',border:'none',boxShadow:'0 8px 32px rgba(0,0,0,0.4)',borderRadius:4}}
          title="Document Preview"
        />
      </div>
    </div>
  )
}
