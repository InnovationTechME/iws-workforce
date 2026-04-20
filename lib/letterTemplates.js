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

const qrBlock = (refNumber, docType, name) => {
  const verifyUrl = `https://www.innovationtech.me/verify?ref=${encodeURIComponent(refNumber)}&name=${encodeURIComponent(name)}&doc=${docType}`
  return `<div style="position:absolute;bottom:20mm;right:20mm;text-align:center">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(verifyUrl)}&margin=4&color=0f172a" alt="Verify" style="width:70px;height:70px;display:block;margin:0 auto 4px auto" />
    <div style="font-size:7pt;color:#64748b">Scan to verify</div>
    <div style="font-size:6pt;color:#94a3b8;font-family:monospace">${refNumber}</div>
  </div>`
}

const shell = (refNumber, date, content) => `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Barlow',sans-serif;font-size:13px;color:#1a1a2e;background:#fff}
.page{width:210mm;min-height:297mm;margin:0 auto;padding:14mm 18mm 22mm;position:relative}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #1e3a8a;padding-bottom:12px;margin-bottom:16px}
.logo-area{display:flex;align-items:center;gap:12px}
.co-name{font-size:15px;font-weight:700;color:#1e3a8a;line-height:1.2}
.co-tagline{font-size:10px;color:#64748b;margin-top:2px}
.header-right{text-align:right;font-size:10px;color:#64748b;line-height:1.8}
.ref-bar{display:flex;justify-content:space-between;background:#f0fdfa;border:1px solid #99f6e4;border-radius:4px;padding:8px 14px;margin-bottom:18px;font-size:11px}
.ref-label{font-weight:700;color:#1e3a8a}
.letter-title{font-size:16px;font-weight:700;color:#0f172a;text-align:center;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px}
.subtitle{font-size:11px;color:#64748b;text-align:center;margin-bottom:18px;direction:rtl}
.body-text{line-height:1.9;margin-bottom:12px;font-size:13px}
.info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px;margin:14px 0}
.info-box table{width:100%;border-collapse:collapse}
.info-box td{padding:5px 4px;font-size:12px;border-bottom:1px solid #f1f5f9}
.info-box td:first-child{font-weight:600;color:#475569;width:44%}
.terms h4{font-size:12px;font-weight:700;color:#1e3a8a;margin:14px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
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
  const basicSalary = Number(offer.base_salary_or_rate || worker.monthly_salary || 0)
  const dailyRate = Math.round((basicSalary / 26) * 100) / 100
  const hourlyRate = Math.round((dailyRate / 8) * 100) / 100
  const ot1Rate = Math.round(hourlyRate * 1.25 * 100) / 100
  const ot2Rate = Math.round(hourlyRate * 1.50 * 100) / 100
  const housingAllowance = Number(offer.housing_allowance || worker.housing_allowance || 0)
  const transportAllowance = Number(offer.transport_allowance || worker.transport_allowance || 0)
  const foodAllowance = Number(offer.food_allowance || worker.food_allowance || 0)
  const fullName = worker.full_name || offer.full_name || '—'
  const firstName = fullName.split(' ')[0]
  const workerNumber = worker.worker_number || offer.id || '—'
  const content = `
<div style="text-align:center;margin-bottom:20px">
  <div style="font-size:18px;font-weight:700;text-decoration:underline;color:#0f172a">Offer Letter</div>
  <div style="font-size:11px;color:#64748b;margin-top:4px">Ref: ${refNumber}</div>
</div>
<div style="margin-bottom:16px">
  <p style="margin-bottom:4px;font-size:13px">Mr./Ms. <strong>${fullName}</strong></p>
  <p style="margin-bottom:4px;font-size:12px;color:#475569">Worker ID: ${workerNumber}</p>
  <p style="margin-bottom:4px;font-size:12px;color:#475569">Nationality: ${worker.nationality||offer.nationality||'—'}</p>
  <p style="margin-bottom:4px;font-size:12px;color:#475569">Passport No.: ${worker.passport_number||offer.passport_number||'—'}</p>
</div>
<p style="font-size:13px;margin-bottom:16px">Dear ${firstName}, we are pleased to extend to you the offer for the position of <strong>${offer.trade_role||worker.trade_role||'—'}</strong> with <strong>Innovation Technologies LLC O.P.C.</strong>, under the terms and conditions listed below:</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:12px">
  <tr><td colspan="2" style="padding:6px 0;font-weight:700;font-size:13px;border-bottom:1px solid #e2e8f0">Salary:</td></tr>
  <tr><td style="padding:5px 0;width:200px;color:#475569">Basic Salary</td><td style="padding:5px 0;font-weight:700">AED ${basicSalary.toLocaleString()} per month.</td></tr>
  <tr><td colspan="2" style="padding:8px 0 4px;font-weight:700;font-size:13px;border-bottom:1px solid #e2e8f0">Overtime:</td></tr>
  <tr><td style="padding:5px 0;color:#475569">Normal OT (OT1)</td><td style="padding:5px 0">AED ${ot1Rate} per hour (1.25x)</td></tr>
  <tr><td style="padding:5px 0;color:#475569">Holiday/Day-off OT</td><td style="padding:5px 0">AED ${ot2Rate} per hour (1.50x)</td></tr>
  <tr><td colspan="2" style="padding:8px 0 4px;font-weight:700;font-size:13px;border-bottom:1px solid #e2e8f0">Working Hours:</td></tr>
  <tr><td style="padding:5px 0;color:#475569">Standard hours</td><td style="padding:5px 0"><strong>8 hours/day, 6 days/week</strong></td></tr>
  <tr><td style="padding:5px 0;color:#475569">Rest day</td><td style="padding:5px 0">Friday (or as assigned)</td></tr>
  <tr><td colspan="2" style="padding:8px 0 4px;font-weight:700;font-size:13px;border-bottom:1px solid #e2e8f0">Benefits:</td></tr>
  <tr><td style="padding:5px 0;color:#475569">Transportation</td><td style="padding:5px 0">${transportAllowance>0?'AED '+transportAllowance+' per month':'Provided by the company.'}</td></tr>
  <tr><td style="padding:5px 0;color:#475569">Accommodation</td><td style="padding:5px 0">${housingAllowance>0?'AED '+housingAllowance+' per month':'Provided by the company.'}</td></tr>
  <tr><td style="padding:5px 0;color:#475569">Health Insurance</td><td style="padding:5px 0">Provided as per UAE Law.</td></tr>
  <tr><td style="padding:5px 0;color:#475569">Annual Air Ticket</td><td style="padding:5px 0">Return ticket every <strong>2 years</strong> of service.</td></tr>
  <tr><td style="padding:5px 0;color:#475569">Food</td><td style="padding:5px 0">${foodAllowance>0?'AED '+foodAllowance+' per month':'Provided by company or AED 10/working day.'}</td></tr>
  <tr><td style="padding:5px 0;color:#475569">Contract Period</td><td style="padding:5px 0">Fixed-term (2 years, renewable by mutual agreement)</td></tr>
  <tr><td style="padding:5px 0;color:#475569">Probation</td><td style="padding:5px 0">3 months (extendable to 6 per UAE law).</td></tr>
  <tr><td style="padding:5px 0;color:#475569">Annual Leave</td><td style="padding:5px 0">30 calendar days/year after 1 year service.</td></tr>
  <tr><td style="padding:5px 0;color:#475569">Notice Period</td><td style="padding:5px 0">Company: <strong>30 days</strong> · Employee: <strong>60 days</strong></td></tr>
</table>
<div style="border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px;margin-bottom:16px;font-size:11.5px">
  <div style="font-weight:700;margin-bottom:8px;font-size:12px">Other Terms &amp; Conditions:</div>
  <ul style="padding-left:18px;margin:0;line-height:1.9">
    <li><strong>Disciplinary Action:</strong> Any violation of company policy or UAE Labour Law, including unauthorised absence, may result in disciplinary action under Article 39 of Federal Decree-Law 33/2021 and the company&rsquo;s written disciplinary code. Penalties will be determined and notified in writing in accordance with UAE law, and may include salary deduction up to the legal maximum of 5 days per month.</li>
    <li><strong>Breach of Contract:</strong> Company may reclaim visa/ticket/employment expenses.</li>
    <li><strong>Safety Compliance:</strong> Strict adherence to workplace safety rules mandatory.</li>
    <li><strong>Termination for Cause:</strong> Immediate termination under Article 44 of Federal Decree-Law No. 33 of 2021.</li>
    ${hi?'<li><em>यह प्रस्ताव UAE श्रम कानून के अनुसार है। कृपया हस्ताक्षर से पहले सभी शर्तें ध्यान से पढ़ें।</em></li>':''}
  </ul>
</div>
<p style="font-size:13px;margin-bottom:24px">Please signify your acceptance by signing and returning a copy.</p>
<div class="sig-block">
  <div class="sig-col">
    <div class="sig-label">Authorised Signatory</div>
    <div class="sig-name">Innovation Technologies LLC O.P.C.</div>
    <div class="sig-line">Signature &amp; Date</div>
    <div class="stamp-box" style="margin-top:8px">Company<br/>Stamp</div>
  </div>
  <div class="sig-col" style="text-align:right">
    <div class="sig-label">Employee Acceptance${hi?' / कर्मचारी की स्वीकृति':''}</div>
    <div class="sig-name">${fullName}</div>
    <div style="font-size:11px;color:#64748b;margin-top:4px">Worker ID: ${workerNumber}</div>
    <div class="sig-line">I, ${fullName}, accept the offer as detailed above.</div>
  </div>
</div>
<div style="font-size:7pt;color:#94a3b8;margin-top:16px;text-align:center">This offer letter has been digitally generated by IWS. Scan QR code to verify authenticity. Reference: ${refNumber}</div>
${qrBlock(refNumber, 'offer', fullName)}`
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
</div>
<div style="font-size:7pt;color:#94a3b8;margin-top:16px;text-align:center">This letter is digitally registered. Scan QR code to verify authenticity. Reference: ${refNumber}</div>
${qrBlock(refNumber, 'warning', worker.worker_number)}`
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
    <div class="sig-line">Worker ID: ${worker.worker_number}</div>
  </div>
  <div class="sig-col" style="text-align:right">
    <div class="sig-label">Authorised Signatory</div>
    <div class="sig-name">${CO.name}</div>
    <div class="sig-line">HR Manager / Owner &amp; Date</div>
  </div>
</div>`
  return shell(refNumber, date, content)
}

// ── TERMINATION GROUNDS ──────────────────────────────
const TERMINATION_GROUNDS = {
  fighting: { label:'Fighting / Physical assault', article:'Article 44(1)', legal_basis:'physically assaulted a colleague, supervisor, or third party on company premises', consequence:'immediate termination without notice and without End of Service Gratuity' },
  misconduct: { label:'Gross misconduct', article:'Article 44(2)', legal_basis:'committed an act of gross misconduct causing serious harm to the company', consequence:'immediate termination without notice' },
  dereliction: { label:'Dereliction of duties', article:'Article 44(3)', legal_basis:'persistently failed to perform essential duties despite formal warnings', consequence:'termination without notice following documented failures' },
  failure_to_perform: { label:'Failure to perform', article:'Article 44(3)', legal_basis:'repeatedly failed to meet required work standards despite two formal written warnings', consequence:'termination for cause under UAE Labour Law' },
  consecutive_absent: { label:'Unauthorized absence (7+ days)', article:'Article 44(7)', legal_basis:'been absent without authorisation for more than seven consecutive working days', consequence:'treated as abandonment under Article 44(7)' },
  after_two_warnings: { label:'Repeated violation after 2 warnings', article:'Article 44(4)', legal_basis:'continued to violate company policies after receiving two formal written warnings', consequence:'termination without notice following exhaustion of warning process' },
  confidentiality: { label:'Breach of confidentiality', article:'Article 44(5)', legal_basis:'disclosed confidential company information without authorisation', consequence:'immediate termination; company reserves right to pursue legal remedies' },
  financial_damage: { label:'Causing financial damage', article:'Article 44(6)', legal_basis:'deliberately or through gross negligence caused financial loss or damage to company assets', consequence:'termination without notice; cost of damage will be recovered' },
  moral_offence: { label:'Moral offence', article:'Article 44(9)', legal_basis:'committed an act contrary to public morals on company premises', consequence:'immediate termination without notice' },
}
export const TERMINATION_GROUNDS_LIST = TERMINATION_GROUNDS

export const terminationWithNoticeHTML = (worker, details, refNumber, date, lang='english') => {
  const hi = lang === 'hindi'
  const fullName = worker.full_name || '—'
  const noticeDays = details.notice_days || 30
  const lastDay = details.last_working_date || '—'
  const content = `
<div style="text-align:center;margin-bottom:20px"><div style="font-size:16px;font-weight:700;text-transform:uppercase;color:#0f172a">Notice of Termination${hi?' / रोजगार समाप्ति की सूचना':''}</div><div style="font-size:11px;color:#64748b;margin-top:4px">Ref: ${refNumber}</div></div>
<div style="margin-bottom:16px"><p style="font-size:13px">To: <strong>${fullName}</strong></p><p style="font-size:12px;color:#475569">Worker ID: ${worker.worker_number||'—'} · Trade: ${worker.trade_role||'—'} · Passport: ${worker.passport_number||'—'}</p></div>
<p style="font-size:13px;line-height:1.8;margin-bottom:14px">This letter serves as formal notice of the termination of your employment with <strong>Innovation Technologies LLC O.P.C.</strong> effective <strong>${noticeDays} days</strong> from this date, per <strong>Article 43</strong> of UAE Federal Decree-Law No. 33 of 2021.</p>
<div class="info-box"><table><tr><td>Notice period</td><td><strong>${noticeDays} days</strong></td></tr><tr><td>Last working date</td><td><strong>${lastDay}</strong></td></tr><tr><td>Reason</td><td>${details.reason||'—'}</td></tr></table></div>
${details.reason_body ? '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:12px 16px;margin-bottom:14px;font-size:12px"><div style="font-weight:600;color:#92400e;margin-bottom:6px">Details:</div><p>'+details.reason_body+'</p></div>' : ''}
<div style="border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px;margin-bottom:14px;font-size:12px"><div style="font-weight:700;margin-bottom:8px">During the notice period:</div><ul style="padding-left:18px;margin:0;line-height:1.9"><li>Continue performing duties professionally.</li><li>Final salary and accrued leave paid on last day.</li><li>End of Service Gratuity calculated per UAE Labour Law.</li><li>Return all company property before last day.</li><li>Exit clearance required before final settlement.</li></ul></div>
<p style="font-size:13px;margin-bottom:24px">We thank you for your service. Contact HR for exit clearance.</p>
<div class="sig-block"><div class="sig-col"><div class="sig-label">Issued by / HR</div><div class="sig-name">${CO.name}</div><div class="sig-line">HR Manager / Owner &amp; Date</div><div class="stamp-box" style="margin-top:8px">Company<br/>Stamp</div></div><div class="sig-col" style="text-align:right"><div class="sig-label">Acknowledgement</div><div class="sig-name">${fullName}</div><div class="sig-line">Signature &amp; Date</div></div></div>`
  return shell(refNumber, date, content)
}

export const terminationWithoutNoticeHTML = (worker, details, refNumber, date, lang='english') => {
  const hi = lang === 'hindi'
  const fullName = worker.full_name || '—'
  const groundKey = details.ground_key || 'misconduct'
  const ground = TERMINATION_GROUNDS[groundKey] || TERMINATION_GROUNDS.misconduct
  const effectiveDate = details.effective_date || date
  const content = `
<div style="text-align:center;margin-bottom:20px"><div style="font-size:16px;font-weight:700;text-transform:uppercase;color:#991b1b">Termination Without Notice${hi?' / बिना नोटिस के समाप्ति':''}</div><div style="font-size:11px;color:#64748b;margin-top:4px">Ref: ${refNumber} | ${ground.article}</div></div>
<div style="background:#fff1f2;border:2px solid #fca5a5;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:12px;font-weight:600;color:#991b1b;text-align:center">⚠ Immediate termination under ${ground.article} of Federal Decree-Law No. 33 of 2021.</div>
<div style="margin-bottom:16px"><p style="font-size:13px">To: <strong>${fullName}</strong></p><p style="font-size:12px;color:#475569">Worker ID: ${worker.worker_number||'—'} · Trade: ${worker.trade_role||'—'} · Passport: ${worker.passport_number||'—'}</p></div>
<p style="font-size:13px;line-height:1.8;margin-bottom:14px">Per <strong>${ground.article}</strong> of UAE Federal Decree-Law No. 33 of 2021, <strong>Innovation Technologies LLC O.P.C.</strong> terminates your employment with immediate effect as of <strong>${effectiveDate}</strong>.</p>
<div style="background:#fff8f8;border:1px solid #fca5a5;border-radius:6px;padding:12px 16px;margin-bottom:14px"><div style="font-weight:700;color:#991b1b;margin-bottom:8px;font-size:12px">Grounds: ${ground.label}</div><p style="font-size:12px;line-height:1.8">You have <strong>${ground.legal_basis}</strong>.</p>${details.additional_details ? '<p style="font-size:12px;margin-top:8px;border-top:1px solid #fca5a5;padding-top:8px"><strong>Details:</strong> '+details.additional_details+'</p>' : ''}</div>
<div style="border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px;margin-bottom:14px;font-size:12px"><div style="font-weight:700;margin-bottom:8px">Consequence:</div><ul style="padding-left:18px;margin:0;line-height:1.9"><li>Effective immediately — no notice.</li><li>${ground.consequence}.</li><li>Return all company property immediately.</li><li>Visa cancellation initiated immediately.</li></ul></div>
<div class="sig-block"><div class="sig-col"><div class="sig-label">Issued by / HR</div><div class="sig-name">${CO.name}</div><div class="sig-line">HR Manager / Owner &amp; Date</div><div class="stamp-box" style="margin-top:8px">Company<br/>Stamp</div></div><div class="sig-col" style="text-align:right"><div class="sig-label">Acknowledgement (receipt only)</div><div class="sig-name">${fullName}</div><div class="sig-line">Signature &amp; Date</div></div></div>`
  return shell(refNumber, date, content)
}

export const payslipHTML = (worker, payrollLine, batch, { leaveBalance, ytd, ramadanActive, allowanceLines, deductionLines }) => {
  const isFlat = worker.category === 'Contract Worker' || worker.category === 'Subcontract Worker'
  const isOffice = worker.category === 'Office Staff'
  const pl = payrollLine
  const baseRate = isFlat ? (worker.hourly_rate||0) : Math.round(((worker.monthly_salary||0) / 30 / 8) * 100) / 100
  const pYear = Number(batch.year) || new Date().getFullYear()
  const pMonth = Number(batch.month) || (new Date().getMonth() + 1)
  const monthName = new Date(pYear, pMonth-1, 1).toLocaleDateString('en-GB',{month:'long',year:'numeric'})
  const monthAbbr = new Date(pYear, pMonth-1, 1).toLocaleDateString('en-GB',{month:'short'})
  const issueDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const psRef = `IT-PS-${monthAbbr}-${pYear}-${worker.worker_number}`
  const totalDeductions = (pl.deductions_total||0) + (pl.advances_total||0)
  const grossTotal = (pl.gross_pay||0)

  const paymentLabel = (!worker.payment_method || worker.payment_method === 'WPS')
    ? 'C3 Card \u00b7 WPS'
    : worker.payment_method === 'Non-WPS'
      ? 'C3 Card \u00b7 Non-WPS'
      : 'Cash'

  const fmtAED = (v) => 'AED ' + (Number(v)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})
  const fmtNum = (v) => (Number(v)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})

  // ─── Logo ───
  const LOGO_SMALL = LOGO_BASE64
    ? `<img src="${LOGO_BASE64}" style="width:28px;height:28px;object-fit:contain;display:block" alt="iN"/>`
    : `<div style="width:28px;height:28px;border-radius:50%;background:#0f172a;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:11px;letter-spacing:0.5px">iN</div>`

  // ─── Row helper — hairline-ruled, label/value ───
  const row = (label, value, { mono = false } = {}) => `
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:4px 0;border-bottom:0.5px solid #f1f5f9">
      <span style="font-size:7.5pt;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;font-weight:500">${label}</span>
      <span style="font-size:9.5pt;color:#0f172a;font-weight:500;${mono ? 'font-family:ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:0.02em' : ''}">${value}</span>
    </div>`

  // ─── Earnings rows by worker type ───
  let earningsRows = ''
  if (isFlat) {
    const stdPay = Math.round((pl.normal_hours||0) * (worker.hourly_rate||0) * 100)/100
    const holPremium = Math.round((pl.holiday_hours||0) * (worker.hourly_rate||0) * 0.5 * 100)/100
    earningsRows = `
      ${row('Hourly rate', fmtAED(worker.hourly_rate) + '/hr')}
      ${row('Hours worked', ((pl.normal_hours||0)+(pl.holiday_hours||0)).toFixed(1) + ' h')}
      ${row('Standard pay', fmtAED(stdPay))}
      ${(pl.holiday_hours||0) > 0 ? row('Holiday premium', fmtAED(holPremium)) : ''}
    `
  } else if (isOffice) {
    earningsRows = `
      ${row('Basic salary', fmtAED(worker.monthly_salary))}
      ${(worker.housing_allowance||0) > 0 ? row('Housing allowance', fmtAED(worker.housing_allowance)) : ''}
      ${(worker.transport_allowance||0) > 0 ? row('Transport allowance', fmtAED(worker.transport_allowance)) : ''}
      ${(worker.food_allowance||0) > 0 ? row('Food allowance', fmtAED(worker.food_allowance)) : ''}
    `
  } else {
    const ot1Pay = Math.round((pl.ot_hours||0) * baseRate * 1.25 * 100)/100
    const ot2Pay = Math.round((pl.holiday_hours||0) * baseRate * 1.50 * 100)/100
    const totalAllowance = (worker.housing_allowance||0)+(worker.transport_allowance||0)+(worker.food_allowance||0)
    earningsRows = `
      ${row('Basic salary', fmtAED(worker.monthly_salary))}
      ${totalAllowance > 0 ? row('Allowances', fmtAED(totalAllowance)) : ''}
      ${(pl.ot_hours||0) > 0 ? row(`Weekday OT \u00b7 ${pl.ot_hours}h \u00d7 1.25`, fmtAED(ot1Pay)) : ''}
      ${(pl.holiday_hours||0) > 0 ? row(`Rest / holiday OT \u00b7 ${pl.holiday_hours}h \u00d7 1.50`, fmtAED(ot2Pay)) : ''}
      ${ramadanActive ? `<div style="font-size:7pt;color:#94a3b8;font-style:italic;padding:2px 0 0">Ramadan schedule \u2014 6-hour threshold applied</div>` : ''}
    `
  }

  // ─── Deductions block (conditional) ───
  const deductionsBlock = totalDeductions > 0 ? `
    <div style="margin-top:10mm">
      <div style="font-size:7.5pt;text-transform:uppercase;letter-spacing:0.12em;color:#94a3b8;font-weight:600;margin-bottom:5px">Deductions</div>
      ${(deductionLines||[]).map(d => `
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding:4px 0;border-bottom:0.5px solid #f1f5f9">
          <span style="font-size:9.5pt;color:#0f172a;font-weight:500">${d.label}</span>
          <span style="font-size:9.5pt;color:#0f172a;font-weight:500">\u2212 ${fmtNum(d.amount)}</span>
        </div>
      `).join('')}
    </div>
  ` : ''

  const grossLine = totalDeductions > 0 ? `
    <div style="display:flex;justify-content:space-between;align-items:baseline;padding:8px 0 0;margin-top:4px">
      <span style="font-size:9pt;color:#64748b;font-weight:500">Gross earnings</span>
      <span style="font-size:9pt;color:#64748b;font-weight:500">${fmtAED(grossTotal)}</span>
    </div>
  ` : ''

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#ffffff}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:9pt;color:#0f172a;-webkit-font-smoothing:antialiased;font-feature-settings:"tnum" 1}
@media print { @page{size:A5 portrait;margin:0} }
</style></head><body>
<div id="payslip-print-area" style="width:148mm;min-height:210mm;padding:15mm 14mm 12mm;position:relative;box-sizing:border-box;background:#ffffff">

  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10mm">
    <div style="display:flex;align-items:center;gap:9px">
      ${LOGO_SMALL}
      <div>
        <div style="font-size:9pt;font-weight:600;color:#0f172a;letter-spacing:-0.005em">Innovation Technologies LLC O.P.C.</div>
        <div style="font-size:7pt;color:#94a3b8;margin-top:1px;letter-spacing:0.02em">${CO.phone} \u00b7 ${CO.email}</div>
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:6.5pt;text-transform:uppercase;letter-spacing:0.12em;color:#94a3b8;font-weight:500">Reference</div>
      <div style="font-size:7.5pt;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#0f172a;margin-top:1px;letter-spacing:0.01em">${psRef}</div>
    </div>
  </div>

  <div style="margin-bottom:9mm">
    <div style="display:flex;align-items:baseline;gap:10px">
      <span style="font-size:18pt;font-weight:600;color:#0f172a;letter-spacing:-0.015em">Payslip</span>
      <span style="font-size:10pt;color:#94a3b8;font-weight:400">\u0643\u0634\u0641 \u0627\u0644\u0631\u0627\u062a\u0628</span>
    </div>
    <div style="font-size:9pt;color:#64748b;margin-top:2px;font-weight:400">${monthName}</div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:10mm;row-gap:0;margin-bottom:9mm;padding-top:5px;border-top:0.5px solid #e5e7eb">
    <div>
      ${row('Name', worker.full_name || '\u2014')}
      ${row('Trade', worker.trade_role || '\u2014')}
      ${row('Payment', paymentLabel)}
    </div>
    <div>
      ${row('Worker ID', worker.worker_number || '\u2014', { mono: true })}
      ${row('Nationality', worker.nationality || '\u2014')}
      ${row('Month', monthName)}
    </div>
  </div>

  <div style="margin-bottom:0">
    <div style="font-size:7.5pt;text-transform:uppercase;letter-spacing:0.12em;color:#94a3b8;font-weight:600;margin-bottom:5px">Earnings</div>
    ${earningsRows}
    ${grossLine}
  </div>

  ${deductionsBlock}

  <div style="margin-top:12mm;padding-top:7mm;border-top:0.5px solid #e5e7eb">
    <div style="display:flex;justify-content:space-between;align-items:flex-end">
      <div>
        <div style="font-size:7.5pt;text-transform:uppercase;letter-spacing:0.12em;color:#94a3b8;font-weight:600;margin-bottom:2px">Net pay</div>
        <div style="font-size:7pt;color:#cbd5e1;font-weight:400">\u0635\u0627\u0641\u064a \u0627\u0644\u0631\u0627\u062a\u0628</div>
      </div>
      <div style="font-size:22pt;font-weight:600;color:#0d9488;letter-spacing:-0.02em;line-height:1;font-feature-settings:'tnum' 1">${fmtAED(pl.net_pay)}</div>
    </div>
  </div>

  <div style="position:absolute;bottom:12mm;left:14mm;right:14mm">
    <div style="border-top:0.5px solid #e5e7eb;padding-top:4mm">
      <div style="display:flex;justify-content:space-between;font-size:7pt;color:#94a3b8;letter-spacing:0.01em">
        <span>Issued ${issueDate} \u00b7 Innovation Technologies LLC O.P.C.</span>
        <span style="text-transform:uppercase;letter-spacing:0.12em;font-weight:500">Confidential</span>
      </div>
      <div style="font-size:6.5pt;color:#cbd5e1;margin-top:3px;letter-spacing:0.01em">Delivered to ${worker.email || 'registered email'} \u00b7 Digitally issued via IWS</div>
    </div>
  </div>

</div></body></html>`
}

export const resignationAcceptanceHTML = (worker, details, refNumber, date, lang='english') => {
  const hi = lang === 'hindi'
  const fullName = worker.full_name || '—'
  const content = `
<div style="text-align:center;margin-bottom:20px"><div style="font-size:16px;font-weight:700;text-transform:uppercase;color:#0f172a">Acceptance of Resignation${hi?' / इस्तीफे की स्वीकृति':''}</div><div style="font-size:11px;color:#64748b;margin-top:4px">Ref: ${refNumber}</div></div>
<div style="margin-bottom:16px"><p style="font-size:13px">To: <strong>${fullName}</strong></p><p style="font-size:12px;color:#475569">Worker ID: ${worker.worker_number||'—'} · Trade: ${worker.trade_role||'—'}</p></div>
<p style="font-size:13px;line-height:1.8;margin-bottom:14px">We acknowledge your resignation dated <strong>${details.resignation_date||'—'}</strong>. Your resignation is <strong>accepted</strong> per Article 43 of UAE Federal Decree-Law No. 33 of 2021.</p>
<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:12px 16px;margin-bottom:14px"><table style="width:100%;border-collapse:collapse;font-size:12px"><tr><td style="padding:5px 0;color:#475569;width:200px">Resignation received</td><td style="font-weight:600">${details.resignation_date||'—'}</td></tr><tr><td style="padding:5px 0;color:#475569">Notice period</td><td style="font-weight:600">${details.notice_period||'60 days'}</td></tr><tr><td style="padding:5px 0;color:#475569">Last working date</td><td style="font-weight:600">${details.last_working_date||'—'}</td></tr><tr><td style="padding:5px 0;color:#475569">Joining date</td><td>${worker.joining_date||'—'}</td></tr></table></div>
<div style="border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px;margin-bottom:14px;font-size:12px"><div style="font-weight:700;margin-bottom:8px">Exit process:</div><ul style="padding-left:18px;margin:0;line-height:1.9"><li>Fulfil duties until last working date.</li><li>Handover all duties and company property.</li><li>Final salary and leave settled on last day.</li><li>End of Service Gratuity per UAE Labour Law.</li><li>Visa cancellation on final day.</li></ul></div>
${details.additional_note ? '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:10px 14px;margin-bottom:14px;font-size:12px"><p>'+details.additional_note+'</p></div>' : ''}
<p style="font-size:13px;margin-bottom:24px">We thank you for your contribution and wish you every success.</p>
<div class="sig-block"><div class="sig-col"><div class="sig-label">Authorised Signatory / HR</div><div class="sig-name">${CO.name}</div><div class="sig-line">HR Manager / Owner &amp; Date</div><div class="stamp-box" style="margin-top:8px">Company<br/>Stamp</div></div><div class="sig-col" style="text-align:right"><div class="sig-label">Acknowledged by</div><div class="sig-name">${fullName}</div><div class="sig-line">Signature &amp; Date</div></div></div>`
  return shell(refNumber, date, content)
}

export const policyManualHTML = (worker, refNumber, date) => {

  const content = `

<!-- ══ DOCUMENT TITLE ══ -->
<div class="letter-title">Worker Policy Manual</div>
<div class="subtitle" style="direction:ltr;color:#64748b;font-size:12px;text-align:center;margin-bottom:4px;">कर्मचारी नीति पुस्तिका &nbsp;·&nbsp; دليل سياسة العمال</div>
<div style="text-align:center;margin-bottom:6px;">
  <span style="font-size:10px;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;padding:3px 10px;border-radius:4px;">
    Issued to: <strong>${worker.full_name}</strong> &nbsp;·&nbsp; ID: ${worker.worker_number} &nbsp;·&nbsp; ${worker.trade_role || '—'}
  </span>
</div>

<div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:4px;padding:9px 13px;margin-bottom:14px;font-size:11.5px;color:#134e4a;">
  <strong>Important — Read before signing / महत्वपूर्ण — हस्ताक्षर से पहले पढ़ें:</strong>
  This manual is a legally binding document. Read every section. If you need any part
  explained in Hindi, ask HR before signing. You are entitled to keep a copy of this manual.
</div>

<!-- ══ SECTION 1 ══ -->
<div class="terms">
<h4>1 — Working Hours, Pay &amp; Rest Days &nbsp;·&nbsp; काम के घंटे, वेतन और आराम के दिन</h4>
<p style="font-size:12px;line-height:1.85;color:#334155;margin-bottom:6px;">
  <strong>Standard hours:</strong> 8 hours per day, 6 days per week (48 hours/week).
  During Ramadan: 6 hours per day for all workers.
  Rest day: Friday or as assigned by your supervisor.<br/>
  <span style="color:#64748b;">मानक घंटे: प्रतिदिन 8 घंटे, सप्ताह में 6 दिन। रमजान में 6 घंटे। आराम का दिन: शुक्रवार।</span>
</p>
<p style="font-size:12px;line-height:1.85;color:#334155;margin-bottom:6px;">
  <strong>Overtime (monthly workers):</strong> Weekday OT = 1.25× basic hourly rate.
  Friday / public holiday = 1.50×. Hourly rate = monthly salary ÷ 30 ÷ 8.
  <strong>Flat-rate workers:</strong> all hours at flat rate — no OT premium.
  Public holidays = flat rate × 1.50.<br/>
  <span style="color:#64748b;">OT1 = 1.25×, OT2 = 1.50×। फ्लैट रेट कर्मचारी: सभी घंटे फ्लैट दर पर।</span>
</p>
<p style="font-size:12px;line-height:1.85;color:#334155;margin-bottom:6px;">
  <strong>Rest day work:</strong> Not obligatory. If you agree to work your rest day,
  you are paid 1.5× total (normal pay + 50% supplement, Article 23(4) UAE Labour Law).
  No compensatory day off in addition. If you decline — no deduction. This is your legal right.<br/>
  <span style="color:#64748b;">आराम के दिन काम: 1.5× कुल। मना करें = कोई कटौती नहीं — आपका कानूनी अधिकार।</span>
</p>
<ul style="padding-left:16px;font-size:12px;line-height:1.9;color:#334155;">
  <li><strong>Allowances</strong> (housing, transport, food) paid at the <strong>start of each month in advance</strong> — a company benefit, separate from wages.</li>
  <li><strong>Monthly wages</strong> paid on or before the <strong>15th of the following month</strong> (13th–17th depending on cycle — never later than the 17th). Via C3 card, WPS Endered platform.</li>
  <li><strong>ILOE insurance:</strong> Company enrolls you. Annual premium (AED 60 if salary &lt; AED 16,000 / AED 120 if ≥ AED 16,000) deducted from your <strong>first payslip only</strong>.</li>
  <li><strong>Annual leave:</strong> 30 calendar days per completed year. Under 12 months: not permitted. 12–24 months: management discretion + salary hold. 24 months+: entitlement.</li>
</ul>
</div>

<!-- ══ SECTION 2 ══ -->
<div class="terms">
<h4>2 — Attendance &amp; Sick Leave &nbsp;·&nbsp; उपस्थिति और बीमार अवकाश</h4>
<p style="font-size:12px;line-height:1.85;color:#334155;margin-bottom:6px;">
  <strong>Punctuality:</strong> 15-minute grace period. Three late arrivals within 30 days = written warning + 1-day deduction.
  If unable to attend: notify supervisor or camp boss by phone or WhatsApp <strong>before your shift starts</strong>.
  No notification = unauthorised absence regardless of reason.<br/>
  <span style="color:#64748b;">15 मिनट की छूट। 3 बार देरी = चेतावनी + 1 दिन कटौती। शिफ्ट से पहले सूचित करें।</span>
</p>
<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:4px;padding:9px 13px;font-size:12px;color:#991b1b;margin:8px 0;font-weight:500;">
  <strong>Sick leave — same-day certificate required:</strong>
  (1) Notify supervisor BEFORE your shift.
  (2) Go to a licensed UAE clinic that same day.
  (3) Get a certificate with reference number.
  (4) Send to HR that same day. Next-day submission not accepted.
  No valid certificate = unauthorised absence = NWNP + 2-day penalty deduction.<br/>
  <span style="font-weight:400;">बीमार: उसी दिन प्रमाण पत्र अनिवार्य। प्रमाण पत्र नहीं = अनधिकृत अनुपस्थिति।</span>
</div>
<p style="font-size:11px;color:#64748b;margin-bottom:8px;">
  Verification: Abu Dhabi — tamm.abudhabi/wb/doh/sick-leave-validation ·
  Dubai — services.dha.gov.ae/sheryan · Other — mohap.gov.ae.
  Forged certificate = immediate dismissal + criminal referral.
</p>
</div>

<!-- ══ SECTION 3 ══ -->
<div class="terms">
<h4>3 — PPE — Personal Protective Equipment &nbsp;·&nbsp; व्यक्तिगत सुरक्षा उपकरण</h4>
<p style="font-size:12px;line-height:1.85;color:#334155;margin-bottom:6px;">
  The company provides all required PPE at no cost. Normal wear from proper use will not be charged.
  Loss due to negligence, deliberate damage, misuse, or failure to return on departure =
  replacement cost deducted from salary (max 5 days' basic wage per month, Article 25(1)(h)).<br/>
  <span style="color:#64748b;">PPE निःशुल्क दिया जाता है। लापरवाही से नुकसान = प्रतिस्थापन लागत वेतन से।</span>
</p>
<ul style="padding-left:16px;font-size:12px;line-height:1.9;color:#334155;">
  <li>Safety helmet, high-visibility vest, safety boots, and task-specific PPE mandatory on site at all times.</li>
  <li>Report damaged PPE immediately. Do not continue working with damaged equipment.</li>
  <li>Do not lend, sell, or give your PPE to others. Return all PPE on your last working day.</li>
</ul>
</div>

<!-- ══ SECTION 4 ══ -->
<div class="terms">
<h4>4 — Safety at Work &nbsp;·&nbsp; कार्यस्थल पर सुरक्षा &nbsp;·&nbsp; ISO 45001:2018</h4>
<ul style="padding-left:16px;font-size:12px;line-height:1.9;color:#334155;">
  <li><strong>Working at Height (WAH):</strong> Valid certificate required. Harness check before every lift. No cert = removed from task immediately.</li>
  <li><strong>Certified equipment only.</strong> Never operate machinery or vehicles you are not certified for.</li>
  <li><strong>Report all incidents immediately</strong> — injury, near-miss, or unsafe condition. Failure to report is a disciplinary offence.</li>
  <li><strong>UAE Hot Weather Ban (MOHRE law):</strong> No outdoor work 12:30 PM – 3:00 PM, 15 June – 15 September every year.</li>
  <li><strong>No drugs, alcohol, or intoxicants at the workplace or in company transport.</strong> Arriving intoxicated = immediate dismissal, Article 44(5).</li>
  <li>Client site rules apply in addition to these. Being banned from a client site terminates your assignment.</li>
</ul>
</div>

<!-- ══ SECTION 5 ══ -->
<div class="terms">
<h4>5 — Respect, Conduct &amp; Dignity &nbsp;·&nbsp; सम्मान, आचरण और गरिमा</h4>
<p style="font-size:12px;line-height:1.85;color:#334155;margin-bottom:6px;">
  Every worker must treat every person — colleagues, supervisors, managers, clients, camp management,
  and the public — with full respect and dignity at all times, at the workplace, on client sites,
  in accommodation, in transport, and wherever you represent the company.<br/>
  <span style="color:#64748b;">हर व्यक्ति के साथ सम्मान और गरिमा से व्यवहार करें — सहकर्मी, पर्यवेक्षक, क्लाइंट।</span>
</p>
<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:4px;padding:9px 13px;font-size:12px;color:#991b1b;margin:8px 0;font-weight:500;">
  <strong>Zero tolerance:</strong> Verbal abuse or swearing at any person · Racial, religious, or ethnic insults ·
  Sexual harassment · Threatening behaviour · Bullying · Disrespecting supervisors, managers, or clients.<br/>
  <span style="font-weight:400;">गाली देना · जातीय/धार्मिक अपमान · यौन उत्पीड़न · धमकी · बदमाशी — शून्य सहनशीलता।</span>
</div>
</div>

<!-- ══ SECTION 6 ══ -->
<div class="terms">
<h4>6 — Photography, Recording &amp; Social Media &nbsp;·&nbsp; फोटोग्राफी और सोशल मीडिया</h4>
<div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:4px;padding:9px 13px;font-size:12px;color:#991b1b;margin:8px 0;font-weight:500;">
  <strong>UAE Federal Criminal Law (FDL No. 34 of 2021, amended FL No. 5 of 2024):</strong>
  Photographing or recording any person without consent — even in a public place —
  carries minimum 6 months imprisonment and AED 150,000–500,000 fine.
  This is not just company policy — it is UAE criminal law.<br/>
  <span style="font-weight:400;">बिना सहमति के फोटो/रिकॉर्डिंग = न्यूनतम 6 महीने जेल, AED 1.5–5 लाख जुर्माना।</span>
</div>
<ul style="padding-left:16px;font-size:12px;line-height:1.9;color:#334155;">
  <li>No photography or video on client sites under any circumstances.</li>
  <li>No recording of colleagues in accommodation or transport without clear verbal consent.</li>
  <li>No posting of client sites, colleague photos, or negative content about the company on social media.</li>
</ul>
</div>

<!-- ══ SECTION 7 ══ -->
<div class="terms">
<h4>7 — Company Property &amp; Damage &nbsp;·&nbsp; कंपनी संपत्ति और क्षति</h4>
<p style="font-size:12px;line-height:1.85;color:#334155;margin-bottom:6px;">
  You are responsible for all company property in your care. Deliberate or negligent damage or loss
  = repair/replacement cost deducted from salary (max 5 days' basic wage per month, Article 25(1)(h)).
  Written notice given before any deductions begin. Report accidental damage immediately.<br/>
  <span style="color:#64748b;">कंपनी संपत्ति की जिम्मेदारी आपकी है। नुकसान = लागत वेतन से (अधिकतम 5 दिन/माह)।</span>
</p>
</div>

<!-- ══ SECTION 8 ══ -->
<div class="terms">
<h4>8 — Accommodation Rules &nbsp;·&nbsp; आवास नियम</h4>
<ul style="padding-left:16px;font-size:12px;line-height:1.9;color:#334155;">
  <li>Quiet hours 22:00–06:00. Communal areas clean after every use. No cooking in bedrooms.</li>
  <li>No opposite-gender guests in sleeping areas. Report maintenance issues within 24 hours.</li>
  <li><strong>Alcohol:</strong> Responsible personal consumption in private accommodation is permitted.
    Drunk and disorderly, public urination, fighting, or inability to work the next day = conduct
    matter with escalating penalties up to dismissal. 3rd alcohol-related conduct offence in 12 months = dismissal with notice.
    Arriving at workplace or transport intoxicated = immediate dismissal, Article 44(5).</li>
</ul>
</div>

<!-- ══ SECTION 9 ══ -->
<div class="terms">
<h4>9 — Disciplinary Procedure &amp; Penalty Schedule &nbsp;·&nbsp; अनुशासनात्मक प्रक्रिया</h4>
<p style="font-size:12px;line-height:1.85;color:#334155;margin-bottom:6px;">
  The seven permitted penalties (Article 39): (1) Written notice · (2) Written warning ·
  (3) Salary deduction (max 5 days/incident, max 5 days/month from penalties) ·
  (4) Suspension without pay (max 14 days) · (5) Denial of promotion (max 2 years) ·
  (6) Dismissal with notice · (7) Immediate dismissal (Article 44 grounds only).<br/>
  <span style="color:#64748b;">7 अनुमत दंड। एक घटना के लिए केवल एक दंड। कुल कटौती शुद्ध वेतन के 50% से अधिक नहीं।</span>
</p>
<p style="font-size:12px;line-height:1.85;color:#334155;margin-bottom:4px;">
  <strong>Before any penalty:</strong> Written notification · Minimum 5 working days to respond ·
  Investigation documented · Written notice of penalty. One penalty per incident only.
  Total deductions cannot exceed 50% of net salary in any month.
  No penalty for an offence discovered more than 30 days ago.
</p>
<p style="font-size:12px;line-height:1.85;color:#334155;">
  <strong>Article 44 immediate dismissal grounds:</strong>
  False documents · Financial damage · Deliberate safety violation · Disclosing trade secrets ·
  Intoxication at work or transport · Physical assault · 7+ consecutive or 20+ non-consecutive
  absent days · Conviction for honour/honesty crime · Abuse of position · Unauthorised work for another employer.
  EOS gratuity still payable if 1+ year service.
</p>
</div>

<!-- ══ SECTION 10 ══ -->
<div class="terms">
<h4>10 — Grievance Procedure &amp; Your Rights &nbsp;·&nbsp; शिकायत प्रक्रिया और आपके अधिकार</h4>
<p style="font-size:12px;line-height:1.85;color:#334155;margin-bottom:6px;">
  Step 1: Speak to your supervisor. Step 2: Submit written grievance to HR —
  acknowledgement within 3 working days, response within 10.
  Step 3: Contact MOHRE directly at any time — no company permission required.
  <strong>MOHRE Hotline: 800 60</strong> (free · Hindi available · 24/7) · mohre.gov.ae<br/>
  <span style="color:#64748b;">MOHRE हॉटलाइन: 800 60 (निःशुल्क · हिंदी में · 24/7)। कंपनी की अनुमति की जरूरत नहीं।</span>
</p>
<div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:4px;padding:9px 13px;font-size:12px;color:#134e4a;margin:8px 0;">
  <strong>Rights no company policy can remove:</strong>
  Salary on time every month · Safe workplace · Dignity at work ·
  Contact MOHRE without permission · Experience Certificate on departure ·
  End of Service Gratuity after 1 year.<br/>
  <span style="font-size:11px;">समय पर वेतन · सुरक्षित कार्यस्थल · सम्मानजनक व्यवहार · MOHRE में शिकायत का अधिकार · अनुभव प्रमाण पत्र · EOS ग्रेच्युटी।</span>
</div>
</div>

<!-- ══ SIGNATURE ══ -->
<div class="sig-block">
  <div class="sig-col">
    <div class="sig-label">Worker / कर्मचारी · موظف</div>
    <div class="sig-name">${worker.full_name}</div>
    <div class="sig-line">Signature &amp; Date / हस्ताक्षर और तारीख</div>
    <div style="font-size:10px;color:#64748b;margin-top:8px;line-height:1.5;">
      I confirm I have received, read, and understood this manual,
      or have had it explained to me. I agree to comply with all policies.
      I have been given a copy to keep.<br/>
      मैं पुष्टि करता/करती हूं कि मैंने यह मैनुअल पढ़ा और समझा है।
    </div>
  </div>
  <div class="sig-col" style="text-align:right;">
    <div class="sig-label">For ${CO.name}</div>
    <div class="sig-name">HR Representative / मानव संसाधन प्रतिनिधि</div>
    <div class="sig-line">HR Signature, Name &amp; Date</div>
    <div class="stamp-box" style="margin-left:auto;">Company<br/>Stamp</div>
  </div>
</div>`

  return shell(refNumber, date, content)
}
