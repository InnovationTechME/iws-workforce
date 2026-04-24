import { LOGO_BASE64 } from './logoBase64.js'

const LOGO_SVG_FALLBACK = `<svg width="52" height="62" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="cv1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#10b981"/></linearGradient></defs><circle cx="38" cy="12" r="10" fill="url(#cv1)"/><rect x="20" y="28" width="16" height="70" rx="8" fill="#0ea5e9"/><path d="M36 28 L80 98 L80 28" stroke="#06b6d4" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/><rect x="72" y="28" width="16" height="70" rx="8" fill="#10b981"/></svg>`

const LOGO_IMG_TAG = LOGO_BASE64
  ? `<img src="${LOGO_BASE64}" style="width:52px;height:62px;object-fit:contain" alt="iN" />`
  : LOGO_SVG_FALLBACK

// Clean placeholder — soft beige rectangle, centered "PHOTO PENDING" in
// muted grey. A real photo_url (when captured in a future PR) will
// replace this entirely.
const PHOTO_PLACEHOLDER = `<svg width="110" height="130" viewBox="0 0 110 130" xmlns="http://www.w3.org/2000/svg">
  <rect width="110" height="130" rx="8" fill="#f5f1eb" stroke="#e7e0d4" stroke-width="1"/>
  <text x="55" y="68" text-anchor="middle" font-family="Barlow, sans-serif" font-size="10" font-weight="700" fill="#94a3b8" letter-spacing="1">PHOTO</text>
  <text x="55" y="82" text-anchor="middle" font-family="Barlow, sans-serif" font-size="10" font-weight="700" fill="#94a3b8" letter-spacing="1">PENDING</text>
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

function calculateAge(dobStr) {
  if (!dobStr) return null
  const dob = new Date(dobStr)
  if (Number.isNaN(dob.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

export const workerCoverPageHTML = (worker, experiences=[], photoDataUrl=null) => {
  const age = calculateAge(worker.date_of_birth)
  const photoMarkup = photoDataUrl
    ? `<img src="${photoDataUrl}" alt="${worker.full_name || 'Worker'} passport photo" style="width:110px;height:130px;object-fit:cover;border-radius:8px;border:1px solid #e7e0d4;display:block" />`
    : PHOTO_PLACEHOLDER

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
      ${LOGO_IMG_TAG}
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
    <div class="photo-box">${photoMarkup}</div>
    <div class="info-main">
      <!-- §5 cleanup: trade is the visual headline; name/ref are NOT
           repeated in the hero header — they live once in the grid
           below (Full Name) and once in the Worker Reference cell. -->
      <div style="font-size:24px;font-weight:600;color:#0891b2;line-height:1.15;margin-bottom:6px">${worker.trade_role || '—'}</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:6px">
        ${worker.nationality || '—'}${age != null ? ` · ${age} years` : ''} · <span style="font-family:monospace;color:#1e3a8a">${worker.worker_number}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">
        ${[
          ['Full Name', worker.full_name],
          ['Nationality', worker.nationality||'—'],
          ['Age', age != null ? age+' years' : '—'],
          ['Trade / Position', worker.trade_role||'—'],
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
