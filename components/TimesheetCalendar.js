'use client'

export default function TimesheetCalendar({ timesheetData, month, daysInMonth, editable = false, onCellChange }) {
  const days = Array.from({ length: daysInMonth || 28 }, (_, i) => i + 1)

  const getCellBg = (hours) => {
    if (!hours || hours === 0) return '#f8fafc'
    if (hours <= 8) return '#f0fdf4'
    if (hours <= 10) return '#fefce8'
    return '#fff7ed'
  }

  const getCellColor = (hours) => {
    if (!hours || hours === 0) return 'var(--hint)'
    if (hours <= 8) return '#166534'
    if (hours <= 10) return '#854d0e'
    return '#9a3412'
  }

  return (
    <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:10,overflow:'hidden'}}>
      <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border)'}}>
        <div style={{fontSize:15,fontWeight:700}}>{month} Timesheet</div>
        <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{timesheetData.length} workers · {daysInMonth || 28} days</div>
      </div>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead>
            <tr style={{background:'var(--surface)'}}>
              <th style={{padding:'8px 12px',textAlign:'left',position:'sticky',left:0,background:'var(--surface)',zIndex:2,minWidth:180,borderRight:'2px solid var(--border)',fontSize:11,fontWeight:600,color:'var(--hint)',textTransform:'uppercase'}}>Worker</th>
              {days.map(d => <th key={d} style={{padding:'6px 4px',textAlign:'center',minWidth:40,fontSize:11,fontWeight:500,color:'var(--muted)'}}>{d}</th>)}
              <th style={{padding:'8px 12px',textAlign:'center',borderLeft:'2px solid var(--border)',background:'#eff6ff',fontSize:11,fontWeight:700,color:'var(--teal)',minWidth:70}}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {timesheetData.map((worker, wi) => {
              const total = worker.daily_hours.reduce((s, h) => s + (h || 0), 0)
              return (
                <tr key={wi} style={{borderBottom:'1px solid #f1f5f9',background:wi % 2 === 0 ? '#fff' : '#fafbfc'}}>
                  <td style={{padding:'8px 12px',position:'sticky',left:0,background:wi % 2 === 0 ? '#fff' : '#fafbfc',zIndex:1,borderRight:'2px solid var(--border)'}}>
                    <div style={{fontWeight:500,fontSize:12}}>{worker.worker_name}</div>
                    <div style={{fontSize:10,color:'var(--hint)'}}>{worker.worker_id || worker.client_worker_id || ''}</div>
                  </td>
                  {days.map((d, di) => {
                    const hrs = worker.daily_hours[di] || 0
                    return (
                      <td key={di} style={{padding:'4px 2px',textAlign:'center',background:getCellBg(hrs),borderRight:'1px solid #f1f5f9'}}>
                        {editable ? (
                          <input type="number" value={hrs||''} onChange={e => onCellChange && onCellChange(wi, di, parseFloat(e.target.value)||0)} style={{width:36,textAlign:'center',border:'1px solid transparent',borderRadius:3,fontSize:12,padding:'2px',background:'transparent'}} />
                        ) : (
                          <span style={{fontFamily:'monospace',fontWeight:hrs > 0 ? 600 : 400,color:getCellColor(hrs),fontSize:12}}>{hrs > 0 ? hrs : '—'}</span>
                        )}
                      </td>
                    )
                  })}
                  <td style={{padding:'8px 12px',textAlign:'center',borderLeft:'2px solid var(--border)',background:'#eff6ff',fontWeight:700,fontSize:13,color:'var(--teal)'}}>{Math.round(total * 10) / 10}h</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{background:'var(--surface)',borderTop:'2px solid var(--border)'}}>
              <td style={{padding:'8px 12px',fontWeight:700,fontSize:11,position:'sticky',left:0,background:'var(--surface)',zIndex:1,borderRight:'2px solid var(--border)'}}>DAY TOTALS</td>
              {days.map((d, di) => {
                const dayTotal = timesheetData.reduce((s, w) => s + (w.daily_hours[di] || 0), 0)
                return <td key={di} style={{padding:'4px 2px',textAlign:'center',fontSize:11,fontWeight:600,color:'var(--muted)'}}>{dayTotal > 0 ? dayTotal : ''}</td>
              })}
              <td style={{padding:'8px 12px',textAlign:'center',borderLeft:'2px solid var(--border)',background:'#dbeafe',fontWeight:800,fontSize:14,color:'var(--teal)'}}>
                {Math.round(timesheetData.reduce((s, w) => s + w.daily_hours.reduce((ss, h) => ss + (h || 0), 0), 0) * 10) / 10}h
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div style={{padding:'12px 20px',borderTop:'1px solid var(--border)',background:'var(--surface)',display:'flex',gap:20,fontSize:11}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:14,height:14,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:3}} /> Off (0h)</div>
        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:14,height:14,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:3}} /> Regular (1-8h)</div>
        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:14,height:14,background:'#fefce8',border:'1px solid #fde68a',borderRadius:3}} /> OT (9-10h)</div>
        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:14,height:14,background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:3}} /> Heavy OT (11+h)</div>
      </div>
    </div>
  )
}
