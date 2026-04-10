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
  <tr><td style="padding:5px 0;color:#475569">Contract Period</td><td style="padding:5px 0">${offer.employment_type||'2 years'}, Renewable.</td></tr>
  <tr><td style="padding:5px 0;color:#475569">Probation</td><td style="padding:5px 0">3 months (extendable to 6 per UAE law).</td></tr>
  <tr><td style="padding:5px 0;color:#475569">Annual Leave</td><td style="padding:5px 0">30 calendar days/year after 1 year service.</td></tr>
  <tr><td style="padding:5px 0;color:#475569">Notice Period</td><td style="padding:5px 0">Company: <strong>30 days</strong> · Employee: <strong>60 days</strong></td></tr>
</table>
<div style="border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px;margin-bottom:16px;font-size:11.5px">
  <div style="font-weight:700;margin-bottom:8px;font-size:12px">Other Terms &amp; Conditions:</div>
  <ul style="padding-left:18px;margin:0;line-height:1.9">
    <li><strong>Unauthorized Absence:</strong> 2 days' salary deducted per day of unauthorized absence.</li>
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
