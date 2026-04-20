/**
 * lib/payslipPDF.js
 * PDF generation for payslips and individual worker timesheets.
 * Uses html2canvas + jsPDF to render the styled HTML template to real PDFs.
 * Blobs are reusable for future email/WhatsApp attachment.
 */

import { payslipHTML } from './letterTemplates'

/**
 * Adapter: Supabase payroll_lines row → payslipHTML template shape.
 *
 * Supabase columns:  ot1_hours, ot2_hours, total_hours
 * Template expects:  ot_hours, holiday_hours, normal_hours
 */
export function payrollLineToTemplateShape(line) {
  const ot1Hours = Number(line.ot1_hours ?? 0)
  const ot2Hours = Number(line.ot2_hours ?? 0)
  const totalHours = Number(line.total_hours ?? 0)
  return {
    normal_hours: Math.max(0, totalHours - ot1Hours - ot2Hours),
    ot_hours: ot1Hours,
    holiday_hours: ot2Hours,
    total_hours: totalHours,
    gross_pay: Number(line.gross_pay ?? 0),
    deductions_total: Number(line.deductions_total ?? 0),
    advances_total: 0,
    net_pay: Number(line.net_pay ?? 0),
    payment_method: line.payment_method ?? 'WPS',
    payroll_type: line.payroll_type,
    basic_salary: Number(line.basic_salary ?? 0),
    allowances_total: Number(line.allowances_total ?? 0),
    ot1_pay: Number(line.ot1_pay ?? 0),
    ot2_pay: Number(line.ot2_pay ?? 0),
    rate_used: Number(line.rate_used ?? 0),
    ramadan_mode: line.ramadan_mode ?? false,
  }
}

function safeName(s) { return String(s || '').replace(/[^a-zA-Z0-9]/g, '_') }

/**
 * Generate a single payslip PDF Blob. A5 portrait, 148mm × 210mm.
 */
export async function generatePayslipPDF(worker, payrollLine, batch) {
  const html2canvas = (await import('html2canvas')).default
  const jsPDF = (await import('jspdf')).default

  const pl = payrollLineToTemplateShape(payrollLine)
  const html = payslipHTML(worker, pl, batch, {
    leaveBalance: null,
    ytd: null,
    ramadanActive: pl.ramadan_mode,
    allowanceLines: [],
    deductionLines: pl.deductions_total > 0
      ? [{ label: 'Deductions', amount: pl.deductions_total }]
      : [],
  })

  const wrapper = document.createElement('div')
  wrapper.style.cssText =
    'position:absolute;left:-99999px;top:0;width:148mm;background:white;'
  wrapper.innerHTML = html
  document.body.appendChild(wrapper)

  try {
    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    })
    const imgData = canvas.toDataURL('image/jpeg', 0.92)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5',
      compress: true,
    })
    const pageW = 148, pageH = 210
    const imgH = (canvas.height * pageW) / canvas.width
    if (imgH <= pageH) {
      pdf.addImage(imgData, 'JPEG', 0, 0, pageW, imgH, undefined, 'FAST')
    } else {
      let y = 0
      while (y < imgH) {
        if (y > 0) pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, -y, pageW, imgH, undefined, 'FAST')
        y += pageH
      }
    }
    return pdf.output('blob')
  } finally {
    document.body.removeChild(wrapper)
  }
}

export async function downloadPayslipPDF(worker, payrollLine, batch) {
  const blob = await generatePayslipPDF(worker, payrollLine, batch)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Payslip_${safeName(worker.worker_number)}_${safeName(worker.full_name)}_${safeName(batch.month_label)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Zip all payslips for a batch. Each worker gets a PDF inside.
 */
export async function downloadBatchPayslipsZip(batch, payrollLines) {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  const folderName = `Innovation_Payslips_${safeName(batch.month_label)}`
  const folder = zip.folder(folderName)

  for (const line of payrollLines) {
    const worker = line.worker
    if (!worker) continue
    const blob = await generatePayslipPDF(worker, line, batch)
    folder.file(
      `${safeName(worker.worker_number)}_${safeName(worker.full_name)}.pdf`,
      blob
    )
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${folderName}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Individual worker timesheet PDF — A4 portrait.
 * Renders a day-by-day hours grid for one worker for one month.
 */
export async function downloadIndividualTimesheetPDF(worker, monthLabel, dailyLines) {
  const html2canvas = (await import('html2canvas')).default
  const jsPDF = (await import('jspdf')).default

  const wrapper = document.createElement('div')
  wrapper.style.cssText =
    'position:absolute;left:-99999px;top:0;width:210mm;background:white;font-family:Arial,sans-serif;padding:15mm;'
  wrapper.innerHTML = renderTimesheetHTML(worker, monthLabel, dailyLines)
  document.body.appendChild(wrapper)

  try {
    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = 210, pageH = 297
    const imgH = (canvas.height * pageW) / canvas.width
    if (imgH <= pageH) {
      pdf.addImage(imgData, 'PNG', 0, 0, pageW, imgH)
    } else {
      let y = 0
      while (y < imgH) {
        if (y > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -y, pageW, imgH)
        y += pageH
      }
    }
    const blob = pdf.output('blob')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Timesheet_${safeName(worker.worker_number)}_${safeName(worker.full_name)}_${safeName(monthLabel)}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } finally {
    document.body.removeChild(wrapper)
  }
}

function renderTimesheetHTML(worker, monthLabel, dailyLines) {
  const totalHours = dailyLines.reduce((s, l) => s + Number(l.total_hours || 0), 0)
  const otHours = dailyLines.reduce((s, l) => s + Number(l.ot_hours || l.ot1_hours || 0), 0)
  const rows = dailyLines.map(l => `
    <tr>
      <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:9pt;">${l.work_date}</td>
      <td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:right;font-size:9pt;">${Number(l.total_hours || 0).toFixed(1)}</td>
      <td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:right;font-size:9pt;">${Number(l.ot_hours || l.ot1_hours || 0).toFixed(1)}</td>
      <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:9pt;">${l.is_public_holiday ? 'Public Holiday' : (l.is_friday ? 'Friday' : '')}</td>
    </tr>
  `).join('')

  return `
    <div style="font-size:10pt;color:#0f172a;">
      <h1 style="color:#0891b2;font-size:18pt;margin:0 0 4px 0;">Innovation Technologies LLC O.P.C.</h1>
      <h2 style="font-size:12pt;margin:0 0 20px 0;color:#475569;">Worker Timesheet — ${monthLabel}</h2>
      <table style="margin-bottom:16px;font-size:10pt;">
        <tr><td style="padding:3px 12px 3px 0;font-weight:600;">Worker:</td><td>${worker.full_name || ''}</td></tr>
        <tr><td style="padding:3px 12px 3px 0;font-weight:600;">Worker ID:</td><td>${worker.worker_number || ''}</td></tr>
        <tr><td style="padding:3px 12px 3px 0;font-weight:600;">Category:</td><td>${worker.category || ''}</td></tr>
        <tr><td style="padding:3px 12px 3px 0;font-weight:600;">Trade:</td><td>${worker.trade_role || worker.trade || '—'}</td></tr>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:9pt;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left;">Date</th>
            <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">Hours</th>
            <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">OT</th>
            <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left;">Notes</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="background:#e0f2fe;font-weight:700;">
            <td style="padding:6px 8px;border:1px solid #cbd5e1;">Total</td>
            <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">${totalHours.toFixed(1)}h</td>
            <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:right;">${otHours.toFixed(1)}h</td>
            <td style="padding:6px 8px;border:1px solid #cbd5e1;"></td>
          </tr>
        </tfoot>
      </table>
      <p style="font-size:8pt;color:#94a3b8;margin-top:20px;">
        Licence: CN-5087790 · MOHRE: 1979124 · Generated ${new Date().toLocaleDateString('en-GB')} · IWS Workforce System · CONFIDENTIAL
      </p>
    </div>
  `
}
