// Company constants
const CO = {
  name: 'Innovation Technologies LLC O.P.C.',
  address: 'Workhub, M21, Musaffah, Abu Dhabi, UAE',
  phone: '+971 2 333 6633',
  mobile: '+971 56 244 6666',
  email: 'info@innovationtech.me',
  web: 'www.innovationtech.me',
  licence: 'CN-5087790',
  vat: '104184776300003',
  mohre: '1979124',
}

// Shared letter shell — wraps content in branded A4 layout
const shell = (refNumber, date, content, lang='english') => `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Barlow',sans-serif; font-size:13px; color:#1a1a2e; background:#fff; }
  .page { width:210mm; min-height:297mm; margin:0 auto; padding:16mm 18mm 20mm; position:relative; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0d9488; padding-bottom:12px; margin-bottom:18px; }
  .logo-area { display:flex; align-items:center; gap:12px; }
  .logo-mark { width:48px; height:48px; }
  .co-name { font-size:15px; font-weight:700; color:#0d9488; line-height:1.2; }
  .co-sub { font-size:10px; color:#64748b; }
  .header-right { text-align:right; font-size:10px; color:#64748b; line-height:1.7; }
  .ref-bar { display:flex; justify-content:space-between; background:#f0fdfa; border:1px solid #99f6e4; border-radius:4px; padding:8px 12px; margin-bottom:18px; font-size:11px; }
  .ref-label { font-weight:600; color:#0d9488; }
  .letter-title { font-size:16px; font-weight:700; color:#0f172a; text-align:center; margin-bottom:18px; text-transform:uppercase; letter-spacing:0.5px; }
  .arabic-title { font-size:13px; color:#64748b; text-align:center; margin-bottom:14px; direction:rtl; }
  .body-text { line-height:1.8; margin-bottom:12px; }
  .highlight-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px 16px; margin:14px 0; }
  .highlight-box table { width:100%; border-collapse:collapse; }
  .highlight-box td { padding:4px 0; font-size:12px; }
  .highlight-box td:first-child { font-weight:600; color:#475569; width:45%; }
  .terms { margin:14px 0; }
  .terms h4 { font-size:12px; font-weight:700; color:#0d9488; margin-bottom:6px; border-bottom:1px solid #e2e8f0; padding-bottom:4px; }
  .terms ul { padding-left:18px; }
  .terms li { font-size:12px; line-height:1.8; }
  .signature-block { margin-top:32px; display:flex; justify-content:space-between; }
  .sig-box { width:45%; }
  .sig-line { border-top:1px solid #334155; margin-top:40px; padding-top:6px; font-size:11px; color:#475569; }
  .stamp-box { width:110px; height:110px; border:2px dashed #cbd5e1; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:10px; color:#94a3b8; text-align:center; margin-top:8px; }
  .footer { position:absolute; bottom:12mm; left:18mm; right:18mm; border-top:1px solid #e2e8f0; padding-top:8px; display:flex; justify-content:space-between; font-size:9px; color:#94a3b8; }
  .warning-badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; }
  .badge-1st { background:#fef9c3; color:#854d0e; }
  .badge-2nd { background:#fed7aa; color:#9a3412; }
  .badge-final { background:#fee2e2; color:#991b1b; }
  @media print { .no-print { display:none; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-area">
      <svg class="logo-mark" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
        <circle cx="38" cy="12" r="10" fill="url(#g1)"/>
        <rect x="20" y="28" width="16" height="70" rx="8" fill="url(#g2)"/>
        <path d="M36 28 L80 98 L80 28" stroke="url(#g3)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <rect x="72" y="28" width="16" height="70" rx="8" fill="url(#g4)"/>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#10b981"/></linearGradient>
          <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#0d9488"/></linearGradient>
          <linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#10b981"/></linearGradient>
          <linearGradient id="g4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#0d9488"/></linearGradient>
        </defs>
      </svg>
      <div>
        <div class="co-name">${CO.name}</div>
        <div class="co-sub">Industrial Workforce Solutions · Abu Dhabi, UAE</div>
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
    <span><span class="ref-label">Ref:</span> ${refNumber}</span>
    <span><span class="ref-label">Date:</span> ${date}</span>
  </div>
  ${content}
  <div class="footer">
    <span>${CO.name} · ${CO.address}</span>
    <span>VAT/TRN: ${CO.vat} · MOHRE: ${CO.mohre} · Lic: ${CO.licence}</span>
  </div>
</div>
</body>
</html>`

// ── OFFER LETTER ─────────────────────────────────────────────
export const offerLetterHTML = (worker, offer, refNumber, date, lang='english') => {
  const isHindi = lang === 'hindi'
  const content = `
    <div class="letter-title">Employment Offer Letter${isHindi ? ' / रोजगार प्रस्ताव पत्र' : ''}</div>
    <div class="arabic-title">خطاب عرض العمل</div>
    <p class="body-text">Dear <strong>${worker.full_name}</strong>,</p>
    <p class="body-text">We are pleased to offer you employment with <strong>${CO.name}</strong> on the following terms and conditions:</p>
    <div class="highlight-box">
      <table>
        <tr><td>Position / Trade</td><td>${offer.trade_role || worker.trade_role}</td></tr>
        <tr><td>Employment type</td><td>${offer.employment_type || worker.category}</td></tr>
        <tr><td>Commencement date</td><td>${offer.start_date || '—'}</td></tr>
        <tr><td>Basic salary / Rate</td><td>${offer.pay_type === 'monthly' ? 'AED ' + offer.base_salary_or_rate + '/month' : 'AED ' + offer.base_salary_or_rate + '/hour'}</td></tr>
        ${offer.accommodation_allowance ? '<tr><td>Accommodation allowance</td><td>AED ' + offer.accommodation_allowance + '/month</td></tr>' : ''}
        ${offer.transport_allowance ? '<tr><td>Transport allowance</td><td>AED ' + offer.transport_allowance + '/month</td></tr>' : ''}
        ${offer.food_allowance ? '<tr><td>Food allowance</td><td>AED ' + offer.food_allowance + '/month</td></tr>' : ''}
        <tr><td>Overtime rate (weekday)</td><td>125% of basic hourly rate</td></tr>
        <tr><td>Overtime rate (Friday/holiday)</td><td>150% of basic hourly rate</td></tr>
        <tr><td>Nationality</td><td>${worker.nationality || offer.nationality}</td></tr>
        <tr><td>Passport number</td><td>${worker.passport_number || offer.passport_number}</td></tr>
      </table>
    </div>
    <div class="terms">
      <h4>Terms &amp; Conditions${isHindi ? ' / नियम और शर्तें' : ''}</h4>
      <ul>
        <li>This offer is subject to successful completion of a pre-employment medical examination and visa processing.</li>
        <li>A probationary period of <strong>six (6) months</strong> applies from the commencement date, in accordance with UAE Labour Law (Federal Decree-Law No. 33 of 2021).</li>
        <li>Either party may terminate this agreement during the probationary period with a minimum of <strong>14 days' written notice</strong>.</li>
        <li>After successful completion of probation, the notice period shall be <strong>30 days</strong> for either party.</li>
        <li>The employee shall be entitled to <strong>30 calendar days</strong> of annual leave per year after completing one year of service.</li>
        <li>Medical insurance will be provided by the company in accordance with Abu Dhabi mandatory health insurance requirements.</li>
        <li>End of Service Gratuity will be calculated and paid in accordance with UAE Labour Law.</li>
        <li>The employee must comply with all site safety regulations, PPE requirements, and company policies at all times.</li>
        <li>This offer is contingent upon the provision of valid original documents including passport, qualifications, and any required trade certifications.</li>
        ${isHindi ? '<li><em>यह प्रस्ताव UAE श्रम कानून के अनुसार है। कृपया हस्ताक्षर करने से पहले सभी शर्तें ध्यान से पढ़ें।</em></li>' : ''}
      </ul>
    </div>
    <p class="body-text" style="margin-top:14px;">Please sign and return one copy of this letter as confirmation of your acceptance. This offer will lapse if not accepted within <strong>7 days</strong> of the date above.</p>
    <div class="signature-block">
      <div class="sig-box">
        <p style="font-size:11px;color:#64748b;margin-bottom:4px;">Employee Acceptance / قبول الموظف${isHindi ? ' / कर्मचारी की स्वीकृति' : ''}</p>
        <p style="font-size:12px;font-weight:600;">${worker.full_name}</p>
        <div class="sig-line">Signature &amp; Date</div>
      </div>
      <div class="sig-box" style="text-align:right;">
        <p style="font-size:11px;color:#64748b;margin-bottom:4px;">Authorised Signatory / التوقيع المعتمد</p>
        <p style="font-size:12px;font-weight:600;">${CO.name}</p>
        <div class="sig-line">HR Manager / Owner &amp; Date</div>
        <div class="stamp-box">Company<br/>Stamp</div>
      </div>
    </div>`
  return shell(refNumber, date, content, lang)
}

// ── WARNING LETTER (1st, 2nd, Final) ─────────────────────────
export const warningLetterHTML = (worker, warning, refNumber, date, warningLevel='warning_1st', lang='english') => {
  const isHindi = lang === 'hindi'
  const levelLabel = warningLevel === 'warning_1st' ? 'First (1st)' : warningLevel === 'warning_2nd' ? 'Second (2nd) — Final Notice' : 'Final Warning — Notice of Termination Risk'
  const levelArabic = warningLevel === 'warning_1st' ? 'الإنذار الأول' : warningLevel === 'warning_2nd' ? 'الإنذار الثاني' : 'الإنذار النهائي'
  const levelHindi = warningLevel === 'warning_1st' ? 'पहली चेतावनी' : warningLevel === 'warning_2nd' ? 'दूसरी चेतावनी' : 'अंतिम चेतावनी'
  const badgeClass = warningLevel === 'warning_1st' ? 'badge-1st' : warningLevel === 'warning_2nd' ? 'badge-2nd' : 'badge-final'
  const penaltyBlock = warning.penalty_amount ? `
    <div class="highlight-box" style="border-color:#fca5a5;background:#fff5f5;">
      <table>
        <tr><td>Financial penalty</td><td><strong style="color:#dc2626;">AED ${Number(warning.penalty_amount).toFixed(2)}</strong></td></tr>
        <tr><td>Deduction type</td><td>${warning.penalty_type || 'One-off deduction'}</td></tr>
        <tr><td>Applied to</td><td>Next payroll cycle — pending HR confirmation</td></tr>
      </table>
    </div>` : ''

  const escalationNote = warningLevel === 'warning_2nd'
    ? '<p class="body-text" style="color:#9a3412;font-weight:500;">⚠ This is your <strong>Second (2nd) Official Warning</strong>. You have already received a First Warning on record. Any further misconduct or repetition of this behaviour will result in a <strong>Final Warning and may lead to immediate termination</strong> of your employment contract without further notice, in accordance with UAE Labour Law Article 44.</p>'
    : warningLevel === 'warning_final'
    ? '<p class="body-text" style="color:#991b1b;font-weight:500;">🚨 This is your <strong>Final Warning</strong>. You have received First and Second Warnings on record. Any further misconduct will result in <strong>immediate termination of your employment contract</strong> in accordance with UAE Labour Law Article 44, without entitlement to End of Service Gratuity where applicable.</p>'
    : ''

  const content = `
    <div style="text-align:center;margin-bottom:8px;"><span class="warning-badge ${badgeClass}">${levelLabel} Warning Letter</span></div>
    <div class="letter-title">Official Warning Letter${isHindi ? ' / ' + levelHindi : ''}</div>
    <div class="arabic-title">${levelArabic} · خطاب إنذار رسمي</div>
    <p class="body-text">To: <strong>${worker.full_name}</strong> &nbsp;|&nbsp; ID: ${worker.worker_number} &nbsp;|&nbsp; Trade: ${worker.trade_role}</p>
    <p class="body-text">Dear ${worker.full_name},</p>
    <p class="body-text">This letter serves as an <strong>Official ${levelLabel} Warning</strong> issued by <strong>${CO.name}</strong> in accordance with UAE Federal Decree-Law No. 33 of 2021 on the Regulation of Labour Relations.</p>
    <div class="highlight-box">
      <table>
        <tr><td>Incident / Reason</td><td>${warning.reason}</td></tr>
        <tr><td>Incident date</td><td>${warning.issue_date}</td></tr>
        <tr><td>Issued by</td><td>${warning.issued_by || 'HR Department'}</td></tr>
        <tr><td>Warning reference</td><td>${refNumber}</td></tr>
      </table>
    </div>
    ${penaltyBlock}
    ${escalationNote}
    <div class="terms">
      <h4>Required Actions${isHindi ? ' / आवश्यक कदम' : ''}</h4>
      <ul>
        <li>You are required to <strong>immediately cease</strong> the behaviour or action described above.</li>
        <li>You must acknowledge receipt of this warning by signing and returning the copy provided.</li>
        <li>Failure to improve or repeat of this behaviour will result in escalated disciplinary action.</li>
        <li>You have the right to respond to this warning in writing within <strong>5 working days</strong>.</li>
        ${isHindi ? '<li><em>यदि आपको इस चेतावनी पर आपत्ति है, तो कृपया 5 कार्य दिवसों के भीतर HR विभाग को लिखित रूप से सूचित करें।</em></li>' : ''}
      </ul>
    </div>
    <p class="body-text">This warning will be placed on your permanent employment record and may be referenced in future disciplinary proceedings.</p>
    <div class="signature-block">
      <div class="sig-box">
        <p style="font-size:11px;color:#64748b;">Employee Acknowledgement${isHindi ? ' / कर्मचारी की पावती' : ''}</p>
        <p style="font-size:12px;font-weight:600;">${worker.full_name}</p>
        <div class="sig-line">Signature &amp; Date</div>
      </div>
      <div class="sig-box" style="text-align:right;">
        <p style="font-size:11px;color:#64748b;">Issued by / HR Department</p>
        <p style="font-size:12px;font-weight:600;">${CO.name}</p>
        <div class="sig-line">HR Manager / Owner &amp; Date</div>
        <div class="stamp-box">Company<br/>Stamp</div>
      </div>
    </div>`
  return shell(refNumber, date, content, lang)
}

// ── EXPERIENCE LETTER ─────────────────────────────────────────
export const experienceLetterHTML = (worker, refNumber, date, lang='english') => {
  const isHindi = lang === 'hindi'
  const content = `
    <div class="letter-title">Experience / Employment Certificate${isHindi ? ' / अनुभव प्रमाण पत्र' : ''}</div>
    <div class="arabic-title">شهادة خبرة وعمل</div>
    <p class="body-text">To Whom It May Concern,</p>
    <p class="body-text">This is to certify that <strong>${worker.full_name}</strong> (Passport: ${worker.passport_number}, Nationality: ${worker.nationality}) was employed with <strong>${CO.name}</strong> in the capacity of <strong>${worker.trade_role}</strong>.</p>
    <div class="highlight-box">
      <table>
        <tr><td>Full name</td><td>${worker.full_name}</td></tr>
        <tr><td>Worker ID</td><td>${worker.worker_number}</td></tr>
        <tr><td>Trade / Position</td><td>${worker.trade_role}</td></tr>
        <tr><td>Employment type</td><td>${worker.category}</td></tr>
        <tr><td>Date of joining</td><td>${worker.joining_date || '—'}</td></tr>
        <tr><td>Last working date</td><td>${worker.end_date || date}</td></tr>
        <tr><td>Nationality</td><td>${worker.nationality}</td></tr>
        <tr><td>Passport number</td><td>${worker.passport_number}</td></tr>
      </table>
    </div>
    <p class="body-text">During their tenure, <strong>${worker.full_name}</strong> performed their duties professionally and in accordance with company standards and site safety requirements. This letter is issued upon request for immigration, visa, or employment purposes.</p>
    ${isHindi ? '<p class="body-text"><em>यह प्रमाण पत्र ' + worker.full_name + ' के अनुरोध पर जारी किया गया है। उन्होंने अपने कार्यकाल के दौरान कंपनी के मानकों के अनुसार अपने कर्तव्यों का पालन किया।</em></p>' : ''}
    <div class="signature-block">
      <div class="sig-box">
        <p style="font-size:11px;color:#64748b;">Issued to</p>
        <p style="font-size:12px;font-weight:600;">${worker.full_name}</p>
        <div class="sig-line">Acknowledged &amp; Date</div>
      </div>
      <div class="sig-box" style="text-align:right;">
        <p style="font-size:11px;color:#64748b;">Authorised Signatory</p>
        <p style="font-size:12px;font-weight:600;">${CO.name}</p>
        <div class="sig-line">HR Manager / Owner &amp; Date</div>
        <div class="stamp-box">Company<br/>Stamp</div>
      </div>
    </div>`
  return shell(refNumber, date, content, lang)
}
