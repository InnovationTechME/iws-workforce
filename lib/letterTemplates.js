import { LOGO_BASE64 } from './logoBase64.js'

const LOGO_SVG_FALLBACK = `<svg width="52" height="62" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lt1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#10b981"/></linearGradient></defs><circle cx="38" cy="12" r="10" fill="url(#lt1)"/><rect x="20" y="28" width="16" height="70" rx="8" fill="#0ea5e9"/><path d="M36 28 L80 98 L80 28" stroke="#06b6d4" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/><rect x="72" y="28" width="16" height="70" rx="8" fill="#10b981"/></svg>`

const LOGO_IMG_TAG = LOGO_BASE64
  ? `<img src="${LOGO_BASE64}" style="width:52px;height:52px;object-fit:contain" alt="iN" />`
  : LOGO_SVG_FALLBACK

const CO = {
  name:'Innovation Technologies LLC O.P.C.',
  address:'Workhub, M21, Musaffah, Abu Dhabi, UAE',
  phone:'+971 2 333 6633',
  mobile:'+971 56 244 6666',
  email:'info@innovationtech.me',
  web:'www.innovationtech.me',
  licence:'CN-5087790',
  vat:'104184776300003',
  mohre:'1979124',
}

const shell = (refNumber, date, content) => `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Barlow',sans-serif;font-size:13px;color:#1a1a2e;background:#fff}
.page{width:210mm;min-height:297mm;margin:0 auto;padding:14mm 18mm 22mm;position:relative}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #0d9488;padding-bottom:12px;margin-bottom:16px}
.logo-area{display:flex;align-items:center;gap:12px}
.co-name{font-size:15px;font-weight:700;color:#0d9488;line-height:1.2}
.co-tagline{font-size:10px;color:#64748b;margin-top:2px}
.header-right{text-align:right;font-size:10px;color:#64748b;line-height:1.8}
.ref-bar{display:flex;justify-content:space-between;background:#f0fdfa;border:1px solid #99f6e4;border-radius:4px;padding:8px 14px;margin-bottom:18px;font-size:11px}
.ref-label{font-weight:700;color:#0d9488}
.letter-title{font-size:16px;font-weight:700;color:#0f172a;text-align:center;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px}
.subtitle{font-size:11px;color:#64748b;text-align:center;margin-bottom:18px;direction:rtl}
.body-text{line-height:1.9;margin-bottom:12px;font-size:13px}
.info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px;margin:14px 0}
.info-box table{width:100%;border-collapse:collapse}
.info-box td{padding:5px 4px;font-size:12px;border-bottom:1px solid #f1f5f9}
.info-box td:first-child{font-weight:600;color:#475569;width:44%}
.terms h4{font-size:12px;font-weight:700;color:#0d9488;margin:14px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
.terms ul{padding-left:18px}
.terms li{font-size:12px;line-height:1.9;color:#334155}
.warn-box{border-radius:6px;padding:10px 14px;margin:12px 0;font-size:12px;font-weight:500}
.sig-block{margin-top:36px;display:flex;justify-content:space-between}
.sig-col{width:44%}
.sig-name{font-size:12px;font-weight:600;margin-bottom:2px}
.sig-label{font-size:10px;color:#64748b;margin-bottom:4px}
.sig-line{border-top:1px solid #334155;margin-top:44px;padding-top:6px;font-size:10px;color:#64748b}
.stamp-box{width:100px;height:100px;border:2px dashed #cbd5e1;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#94a3b8;text-align:center;margin-top:10px}
.footer{position:absolute;bottom:10mm;left:18mm;right:18mm;border-top:1px solid #e2e8f0;padding-top:7px;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8}
.badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700}
</style></head><body>
<div class="page">
<div class="header">
  <div class="logo-area">
    ${LOGO_IMG_TAG}
    <div>
      <div class="co-name">${CO.name}</div>
      <div class="co-tagline">Industrial Workforce Solutions · Abu Dhabi, UAE</div>
    </div>
  </div>
  <div class="header-right">
    ${CO.address}<br/>
    T: ${CO.phone} · M: ${CO.mobile}<br/>
    ${CO.email} · ${CO.web}<br/>
    Lic: ${CO.licence} · MOHRE: ${CO.mohre}
  </div>
</div>
<div class="ref-bar">
  <span><span class="ref-label">Ref No:</span> ${refNumber}</span>
  <span><span class="ref-label">Date:</span> ${date}</span>
</div>
${content}
<div class="footer">
  <span>${CO.name} · ${CO.address}</span>
  <span>VAT/TRN: ${CO.vat} · MOHRE: ${CO.mohre} · Lic: ${CO.licence}</span>
</div>
</div></body></html>`

export const offerLetterHTML = (worker, offer, refNumber, date, lang='english') => {
  const hi = lang === 'hindi'
  const content = `
<div class="letter-title">Employment Offer Letter${hi?' / रोजगार प्रस्ताव पत्र':''}</div>
<div class="subtitle">خطاب عرض العمل</div>
<p class="body-text">Dear <strong>${worker.full_name}</strong>,</p>
<p class="body-text">We are pleased to offer you employment with <strong>${CO.name}</strong> on the following terms and conditions. Please read carefully before signing.</p>
<div class="info-box"><table>
  <tr><td>Full name</td><td>${worker.full_name}</td></tr>
  <tr><td>Passport number</td><td>${worker.passport_number||offer.passport_number||'—'}</td></tr>
  <tr><td>Nationality</td><td>${worker.nationality||offer.nationality||'—'}</td></tr>
  <tr><td>Position / Trade</td><td>${offer.trade_role||worker.trade_role}</td></tr>
  <tr><td>Employment type</td><td>${offer.employment_type||worker.category}</td></tr>
  <tr><td>Commencement date</td><td>${offer.start_date||'—'}</td></tr>
  <tr><td>Basic salary / rate</td><td>${offer.pay_type==='monthly'?'AED '+offer.base_salary_or_rate+'/month':'AED '+offer.base_salary_or_rate+'/hour'}</td></tr>
  ${offer.accommodation_allowance?'<tr><td>Accommodation allowance</td><td>AED '+offer.accommodation_allowance+'/month</td></tr>':''}
  ${offer.transport_allowance?'<tr><td>Transport allowance</td><td>AED '+offer.transport_allowance+'/month</td></tr>':''}
  ${offer.food_allowance?'<tr><td>Food allowance</td><td>AED '+offer.food_allowance+'/month</td></tr>':''}
  <tr><td>OT rate (weekday)</td><td>125% of basic hourly rate</td></tr>
  <tr><td>OT rate (Friday / Public holiday)</td><td>150% of basic hourly rate</td></tr>
</table></div>
<div class="terms">
<h4>Terms &amp; Conditions${hi?' / नियम और शर्तें':''}</h4>
<ul>
  <li>This offer is subject to successful pre-employment medical examination and visa processing.</li>
  <li>A probationary period of <strong>six (6) months</strong> applies from commencement, per UAE Federal Decree-Law No. 33 of 2021.</li>
  <li>During probation, either party may terminate with <strong>14 days' written notice</strong>. After probation: <strong>30 days' notice</strong>.</li>
  <li>Annual leave entitlement: <strong>30 calendar days</strong> per year after completing one year of continuous service.</li>
  <li>Medical insurance provided by the company per Abu Dhabi mandatory health insurance requirements.</li>
  <li>End of Service Gratuity calculated and paid per UAE Labour Law upon completion of one year of service.</li>
  <li>The employee must comply with all site safety regulations, PPE requirements, and company policies at all times.</li>
  <li>This offer lapses if not accepted within <strong>7 days</strong> of the date above.</li>
  ${hi?'<li><em>यह प्रस्ताव UAE श्रम कानून के अनुसार है। कृपया हस्ताक्षर से पहले सभी शर्तें ध्यान से पढ़ें।</em></li>':''}
</ul>
</div>
<div class="sig-block">
  <div class="sig-col">
    <div class="sig-label">Employee Acceptance${hi?' / कर्मचारी की स्वीकृति':''} · قبول الموظف</div>
    <div class="sig-name">${worker.full_name}</div>
    <div class="sig-line">Signature &amp; Date</div>
  </div>
  <div class="sig-col" style="text-align:right">
    <div class="sig-label">Authorised Signatory · التوقيع المعتمد</div>
    <div class="sig-name">${CO.name}</div>
    <div class="sig-line">HR Manager / Owner &amp; Date</div>
    <div class="stamp-box" style="margin-left:auto">Company<br/>Stamp</div>
  </div>
</div>`
  return shell(refNumber, date, content)
}

export const warningLetterHTML = (worker, warning, refNumber, date, warningLevel='warning_1st', lang='english') => {
  const hi = lang === 'hindi'
  const levelMap = {
    warning_1st: { label:'First (1st) Official Warning', arabic:'الإنذار الأول', hindi:'पहली आधिकारिक चेतावनी', bg:'#fef9c3', color:'#854d0e' },
    warning_2nd: { label:'Second (2nd) Official Warning — Final Notice', arabic:'الإنذار الثاني', hindi:'दूसरी चेतावनी', bg:'#fed7aa', color:'#9a3412' },
    warning_final: { label:'Final Warning — Termination Risk', arabic:'الإنذار النهائي', hindi:'अंतिम चेतावनी', bg:'#fee2e2', color:'#991b1b' },
  }
  const lv = levelMap[warningLevel] || levelMap['warning_1st']
  const escalation = warningLevel === 'warning_2nd'
    ? '<div class="warn-box" style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412">⚠ This is your <strong>Second Official Warning</strong>. You have a First Warning on record. Any further misconduct will result in a <strong>Final Warning and may lead to immediate termination</strong> under UAE Labour Law Article 44.</div>'
    : warningLevel === 'warning_final'
    ? '<div class="warn-box" style="background:#fff1f2;border:1px solid #fca5a5;color:#991b1b">🚨 This is your <strong>Final Warning</strong>. First and Second Warnings are on record. Further misconduct will result in <strong>immediate termination</strong> under UAE Labour Law Article 44, without further notice.</div>'
    : ''
  const penaltyBlock = warning.penalty_amount
    ? `<div class="info-box" style="border-color:#fca5a5;background:#fff5f5"><table>
        <tr><td>Financial penalty</td><td><strong style="color:#dc2626">AED ${Number(warning.penalty_amount).toFixed(2)}</strong></td></tr>
        <tr><td>Deduction type</td><td>${warning.penalty_type||'One-off deduction'}</td></tr>
        <tr><td>Applied to</td><td>Next payroll cycle — pending HR confirmation</td></tr>
       </table></div>`
    : ''
  const content = `
<div style="text-align:center;margin-bottom:8px"><span class="badge" style="background:${lv.bg};color:${lv.color}">${lv.label}</span></div>
<div class="letter-title">Official Warning Letter${hi?' / '+lv.hindi:''}</div>
<div class="subtitle">${lv.arabic} · خطاب إنذار رسمي</div>
<p class="body-text">To: <strong>${worker.full_name}</strong> &nbsp;·&nbsp; ID: ${worker.worker_number} &nbsp;·&nbsp; Trade: ${worker.trade_role}</p>
<p class="body-text">This letter serves as an <strong>Official ${lv.label}</strong> issued by <strong>${CO.name}</strong> under UAE Federal Decree-Law No. 33 of 2021 on the Regulation of Labour Relations.</p>
<div class="info-box"><table>
  <tr><td>Reason / Incident</td><td>${warning.reason}</td></tr>
  <tr><td>Incident date</td><td>${warning.issue_date}</td></tr>
  <tr><td>Issued by</td><td>${warning.issued_by||'HR Department'}</td></tr>
  <tr><td>Warning reference</td><td>${refNumber}</td></tr>
</table></div>
${penaltyBlock}
${escalation}
<div class="terms">
<h4>Required Actions${hi?' / आवश्यक कदम':''}</h4>
<ul>
  <li>You are required to <strong>immediately cease</strong> the behaviour described above.</li>
  <li>Acknowledge receipt by signing and returning the copy provided.</li>
  <li>You have the right to respond in writing within <strong>5 working days</strong>.</li>
  <li>This warning is placed on your permanent employment record.</li>
  ${hi?'<li><em>यदि आपको आपत्ति है, तो 5 कार्य दिवसों के भीतर HR को लिखित रूप में सूचित करें।</em></li>':''}
</ul>
</div>
<div class="sig-block">
  <div class="sig-col">
    <div class="sig-label">Employee Acknowledgement${hi?' / कर्मचारी की पावती':''}</div>
    <div class="sig-name">${worker.full_name}</div>
    <div class="sig-line">Signature &amp; Date</div>
  </div>
  <div class="sig-col" style="text-align:right">
    <div class="sig-label">Issued by / HR Department</div>
    <div class="sig-name">${CO.name}</div>
    <div class="sig-line">HR Manager / Owner &amp; Date</div>
    <div class="stamp-box" style="margin-left:auto">Company<br/>Stamp</div>
  </div>
</div>`
  return shell(refNumber, date, content)
}

export const experienceLetterHTML = (worker, refNumber, date, lang='english') => {
  const hi = lang === 'hindi'
  const content = `
<div class="letter-title">Experience &amp; Employment Certificate${hi?' / अनुभव प्रमाण पत्र':''}</div>
<div class="subtitle">شهادة خبرة وعمل</div>
<p class="body-text">To Whom It May Concern,</p>
<p class="body-text">This is to certify that <strong>${worker.full_name}</strong> was employed with <strong>${CO.name}</strong> as <strong>${worker.trade_role}</strong>.</p>
<div class="info-box"><table>
  <tr><td>Full name</td><td>${worker.full_name}</td></tr>
  <tr><td>Worker ID</td><td>${worker.worker_number}</td></tr>
  <tr><td>Passport number</td><td>${worker.passport_number||'—'}</td></tr>
  <tr><td>Nationality</td><td>${worker.nationality||'—'}</td></tr>
  <tr><td>Trade / Position</td><td>${worker.trade_role}</td></tr>
  <tr><td>Employment type</td><td>${worker.category}</td></tr>
  <tr><td>Date of joining</td><td>${worker.joining_date||'—'}</td></tr>
  <tr><td>Last working date</td><td>${worker.end_date||date}</td></tr>
</table></div>
<p class="body-text">During their tenure, <strong>${worker.full_name}</strong> performed their duties professionally and in accordance with company standards and site safety requirements. This certificate is issued upon request for immigration, employment, or visa purposes.</p>
${hi?'<p class="body-text"><em>यह प्रमाण पत्र '+worker.full_name+' के अनुरोध पर जारी किया गया है।</em></p>':''}
<div class="sig-block">
  <div class="sig-col">
    <div class="sig-label">Issued to</div>
    <div class="sig-name">${worker.full_name}</div>
    <div class="sig-line">Acknowledged &amp; Date</div>
  </div>
  <div class="sig-col" style="text-align:right">
    <div class="sig-label">Authorised Signatory</div>
    <div class="sig-name">${CO.name}</div>
    <div class="sig-line">HR Manager / Owner &amp; Date</div>
    <div class="stamp-box" style="margin-left:auto">Company<br/>Stamp</div>
  </div>
</div>`
  return shell(refNumber, date, content)
}
