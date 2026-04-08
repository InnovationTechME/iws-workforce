'use client'
import { useState } from 'react'

export default function LetterViewer({ html, onClose, refNumber, letterType }) {
  const handlePrint = () => {
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
  }

  const handleDownload = () => {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${refNumber}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:9999,display:'flex',flexDirection:'column'}}>
      <div style={{background:'#1e293b',padding:'10px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{color:'white',fontWeight:600,fontSize:13}}>{refNumber}</span>
          <button className="btn btn-teal btn-sm" onClick={handlePrint}>🖨 Print / Save PDF</button>
          <button className="btn btn-secondary btn-sm" onClick={handleDownload}>⬇ Download HTML</button>
        </div>
        <button className="btn btn-ghost btn-sm" style={{color:'white'}} onClick={onClose}>✕ Close</button>
      </div>
      <div style={{flex:1,overflow:'auto',background:'#94a3b8',padding:24,display:'flex',justifyContent:'center'}}>
        <iframe
          srcDoc={html}
          style={{width:'210mm',minHeight:'297mm',background:'white',border:'none',boxShadow:'0 4px 24px rgba(0,0,0,0.3)'}}
          title="Letter Preview"
        />
      </div>
    </div>
  )
}
