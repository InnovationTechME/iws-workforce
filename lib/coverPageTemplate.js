const LOGO_SVG = `<svg width="52" height="62" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="c1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#10b981"/></linearGradient><linearGradient id="c2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#0d9488"/></linearGradient><linearGradient id="c3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#10b981"/></linearGradient><linearGradient id="c4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#0d9488"/></linearGradient></defs><circle cx="38" cy="12" r="10" fill="url(#c1)"/><rect x="20" y="28" width="16" height="70" rx="8" fill="url(#c2)"/><path d="M36 28 L80 98 L80 28" stroke="url(#c3)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/><rect x="72" y="28" width="16" height="70" rx="8" fill="url(#c4)"/></svg>`

const PHOTO_PLACEHOLDER = `<svg width="110" height="130" viewBox="0 0 110 130" xmlns="http://www.w3.org/2000/svg">
  <rect width="110" height="130" rx="8" fill="#e2e8f0"/>
  <circle cx="55" cy="45" r="22" fill="#94a3b8"/>
  <ellipse cx="55" cy="105" rx="32" ry="24" fill="#94a3b8"/>
  <text x="55" y="125" text-anchor="middle" font-size="8" fill="#64748b">Passport Photo</text>
</svg>`

const CO = {
  name:'Innovation Technologies LLC O.P.C.',
  address:'Workhub, M21, Musaffah, Abu Dhabi, UAE',
  phone:'+971 2 333 6633',
  email:'info@innovationtech.me',
  web:'www.innovationtech.me',
  licence:'CN-5087790',
  mohre:'1979124',
  vat:'104184776300003',
}

export const workerCoverPageHTML = (worker, experiences=[]) => {
  const age = worker.date_of_birth
    ? Math.floor((new Date() - new Date(worker.date_of_birth)) / (365.25*24*60*60*1000))
    : null

  const expRows = experiences.length > 0
    ? experiences.map(e => `
        <tr>
          <td style="padding:7px 8px;font-size:12px;font-weight:500">${e.company_name}</td>
          <td style="padding:7px 8px;font-size:12px">${e.position}</td>
          <td style="padding:7px 8px;font-size:12px;color:#64748b">${e.from_date} — ${e.to_date||'Present'}</td>
        </tr>`).join('')
    : `<tr><td colspan="3" style="padding:7px 8px;font-size:12px;color:#94a3b8;font-style:italic">No previous experience records</td></tr>`

  const currentRow = `
    <tr style="background:#f0fdfa">
      <td style="padding:7px 8px;font-size:12px;font-weight:600;color:#0d9488">${CO.name}</td>
      <td style="padding:7px 8px;font-size:12px;font-weight:600;color:#0d9488">${worker.trade_role}</td>
      <td style="padding:7px 8px;font-size:12px;color:#0d9488">${worker.joining_date||'—'} — Present</td>
    </tr>`

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Barlow',sans-serif;background:#fff;color:#1a1a2e}
.page{width:210mm;min-height:297mm;padding:12mm 16mm 16mm;position:relative}
.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0d9488;padding-bottom:12px;margin-bottom:20px}
.co-name{font-size:14px;font-weight:700;color:#0d9488}
.co-sub{font-size:10px;color:#64748b}
.header-right{text-align:right;font-size:9px;color:#94a3b8;line-height:1.7}
.hero{display:flex;gap:24px;margin-bottom:22px;padding:20px;background:linear-gradient(135deg,#f0fdfa,#eff6ff);border:1px solid #99f6e4;border-radius:12px}
.photo-box{flex-shrink:0}
.info-main{flex:1}
.worker-name{font-size:26px;font-weight:800;color:#0f172a;line-height:1.1;margin-bottom:4px}
.worker-id{font-size:12px;color:#64748b;font-family:monospace;margin-bottom:12px}
.tag{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;margin-right:6px;margin-bottom:4px}
.tag-teal{background:#ccfbf1;color:#0f766e}
.tag-blue{background:#dbeafe;color:#1d4ed8}
.tag-slate{background:#f1f5f9;color:#475569}
.section-title{font-size:11px;font-weight:700;color:#0d9488;text-transform:uppercase;letter-spacing:0.6px;margin:18px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
.id-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:4px}
.id-cell{padding:10px 14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0}
.id-cell:nth-child(2n){border-right:none}
.id-cell:nth-last-child(-n+2){border-bottom:none}
.id-label{font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:2px}
.id-value{font-size:13px;font-weight:600;color:#0f172a;font-family:monospace}
.id-expiry{font-size:10px;color:#64748b;margin-top:1px}
.exp-table{width:100%;border-collapse:collapse;font-size:12px}
.exp-table th{background:#f8fafc;padding:8px 8px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid #e2e8f0}
.exp-table td{border-bottom:1px solid #f1f5f9}
.footer{position:absolute;bottom:10mm;left:16mm;right:16mm;border-top:1px solid #e2e8f0;padding-top:7px;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8}
</style></head><body>
<div class="page">
  <div class="header">
    <div style="display:flex;align-items:center;gap:12px">
      ${LOGO_SVG}
      <div>
        <div class="co-name">${CO.name}</div>
        <div class="co-sub">Industrial Workforce Solutions · Abu Dhabi, UAE</div>
      </div>
    </div>
    <div class="header-right">
      ${CO.address}<br/>
      ${CO.phone} · ${CO.email}<br/>
      Lic: ${CO.licence} · MOHRE: ${CO.mohre}
    </div>
  </div>

  <div style="text-align:center;font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px">Worker Profile — Candidate Information Sheet</div>

  <div class="hero">
    <div class="photo-box">${PHOTO_PLACEHOLDER}</div>
    <div class="info-main">
      <div class="worker-name">${worker.full_name}</div>
      <div class="worker-id">${worker.worker_number}</div>
      <div>
        <span class="tag tag-teal">${worker.trade_role}</span>
        <span class="tag tag-blue">${worker.category}</span>
        <span class="tag tag-slate">${worker.nationality||'—'}</span>
        ${worker.active ? '<span class="tag" style="background:#dcfce7;color:#166534">Active</span>' : '<span class="tag" style="background:#fee2e2;color:#991b1b">Inactive</span>'}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">
        ${[
          ['Full Name', worker.full_name],
          ['Nationality', worker.nationality||'—'],
          ['Age', age ? age+' years' : '—'],
          ['Trade / Position', worker.trade_role],
          ['Date of Birth', worker.date_of_birth||'—'],
          ['Date of Joining', worker.joining_date||'—'],
        ].map(([label,value])=>`
          <div>
            <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.3px">${label}</div>
            <div style="font-size:13px;font-weight:600;color:#0f172a">${value}</div>
          </div>`).join('')}
      </div>
    </div>
  </div>

  <div class="section-title">Identity & Document Reference</div>
  <div class="id-grid">
    <div class="id-cell">
      <div class="id-label">Passport Number</div>
      <div class="id-value">${worker.passport_number||'—'}</div>
      <div class="id-expiry">Expiry: ${worker.passport_expiry||'—'}</div>
    </div>
    <div class="id-cell">
      <div class="id-label">Emirates ID</div>
      <div class="id-value">${worker.emirates_id||'—'}</div>
      <div class="id-expiry">Expiry: ${worker.emirates_id_expiry||'—'}</div>
    </div>
    <div class="id-cell">
      <div class="id-label">Worker Reference ID</div>
      <div class="id-value">${worker.worker_number}</div>
      <div class="id-expiry">Innovation Technologies Reference</div>
    </div>
    <div class="id-cell">
      <div class="id-label">Visa / Labour Permit</div>
      <div class="id-value">${worker.visa_number||'—'}</div>
      <div class="id-expiry">Expiry: ${worker.visa_expiry||'—'}</div>
    </div>
  </div>

  <div class="section-title">Work Experience (Last 3 Positions)</div>
  <table class="exp-table">
    <thead><tr><th>Company</th><th>Position</th><th>Period</th></tr></thead>
    <tbody>
      ${expRows}
      ${currentRow}
    </tbody>
  </table>

  <div style="text-align:center;font-size:9px;color:#94a3b8;margin-top:16px;font-style:italic">This document is confidential and prepared exclusively for client use by ${CO.name} · ${CO.web}</div>

  <div class="footer">
    <span>${CO.name} · ${CO.address}</span>
    <span>VAT/TRN: ${CO.vat} · Generated: ${new Date().toLocaleDateString('en-GB')}</span>
  </div>
</div>
</body></html>`
}
