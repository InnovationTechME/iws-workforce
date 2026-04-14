const DOC_TEMPLATES = {
  direct_staff_permanent: [
    { doc_type: 'offer_letter',           label: 'Offer Letter',                    is_blocking: false, in_pack: false, track_expiry: false },
    { doc_type: 'employment_contract',    label: 'Employment Contract',             is_blocking: false, in_pack: false, track_expiry: false },
    { doc_type: 'passport_copy',          label: 'Passport Copy',                   is_blocking: true,  in_pack: true,  track_expiry: true  },
    { doc_type: 'passport_photo',         label: 'Passport Photo',                  is_blocking: true,  in_pack: true,  track_expiry: false },
    { doc_type: 'uae_visa',               label: 'UAE Visa',                        is_blocking: true,  in_pack: true,  track_expiry: true  },
    { doc_type: 'emirates_id',            label: 'Emirates ID',                     is_blocking: true,  in_pack: true,  track_expiry: true  },
    { doc_type: 'medical_fitness',        label: 'Medical Fitness Certificate',     is_blocking: true,  in_pack: false, track_expiry: true  },
    { doc_type: 'labour_card',            label: 'IT Labour Card',                  is_blocking: true,  in_pack: false, track_expiry: true  },
    { doc_type: 'health_insurance',       label: 'Health Insurance Certificate',    is_blocking: true,  in_pack: false, track_expiry: true,  note: 'Compliance only — not in pack' },
    { doc_type: 'health_card',            label: 'Health Card / Photo',             is_blocking: false, in_pack: false, track_expiry: true  },
    { doc_type: 'workmen_compensation',   label: "Workmen's Compensation (WC)",     is_blocking: true,  in_pack: true,  track_expiry: true,  requires_highlight: true },
    { doc_type: 'iloe_certificate',       label: 'ILOE Certificate',                is_blocking: false, in_pack: false, track_expiry: true  },
    { doc_type: 'worker_policy_manual',   label: 'Worker Policy Manual',            is_blocking: false, in_pack: false, track_expiry: false },
  ],
  direct_staff_office: [
    { doc_type: 'offer_letter',           label: 'Offer Letter',                    is_blocking: false, in_pack: false, track_expiry: false },
    { doc_type: 'employment_contract',    label: 'Employment Contract',             is_blocking: false, in_pack: false, track_expiry: false },
    { doc_type: 'passport_copy',          label: 'Passport Copy',                   is_blocking: true,  in_pack: true,  track_expiry: true  },
    { doc_type: 'passport_photo',         label: 'Passport Photo',                  is_blocking: true,  in_pack: true,  track_expiry: false },
    { doc_type: 'uae_visa',               label: 'UAE Visa',                        is_blocking: true,  in_pack: true,  track_expiry: true  },
    { doc_type: 'emirates_id',            label: 'Emirates ID',                     is_blocking: true,  in_pack: true,  track_expiry: true  },
    { doc_type: 'medical_fitness',        label: 'Medical Fitness Certificate',     is_blocking: true,  in_pack: false, track_expiry: true  },
    { doc_type: 'labour_card',            label: 'IT Labour Card',                  is_blocking: true,  in_pack: false, track_expiry: true  },
    { doc_type: 'health_insurance',       label: 'Health Insurance Certificate',    is_blocking: true,  in_pack: false, track_expiry: true,  note: 'Compliance only — not in pack' },
    { doc_type: 'health_card',            label: 'Health Card / Photo',             is_blocking: false, in_pack: false, track_expiry: true  },
    { doc_type: 'workmen_compensation',   label: "Workmen's Compensation (WC)",     is_blocking: true,  in_pack: true,  track_expiry: true,  requires_highlight: true },
    { doc_type: 'iloe_certificate',       label: 'ILOE Certificate',                is_blocking: false, in_pack: false, track_expiry: true  },
    { doc_type: 'worker_policy_manual',   label: 'Worker Policy Manual',            is_blocking: false, in_pack: false, track_expiry: false },
  ],
  contract_worker: [
    { doc_type: 'passport_copy',          label: 'Passport Copy',                   is_blocking: true,  in_pack: true,  track_expiry: true  },
    { doc_type: 'passport_photo',         label: 'Passport Photo',                  is_blocking: true,  in_pack: true,  track_expiry: false },
    { doc_type: 'uae_visa',               label: 'UAE Visa (own)',                  is_blocking: true,  in_pack: true,  track_expiry: true  },
    { doc_type: 'emirates_id',            label: 'Emirates ID / National ID',       is_blocking: true,  in_pack: true,  track_expiry: true  },
    { doc_type: 'health_insurance',       label: 'Health Insurance (own)',          is_blocking: false, in_pack: false, track_expiry: true,  note: 'Compliance only — not in pack' },
    { doc_type: 'health_card',            label: 'Health Card / Photo',             is_blocking: false, in_pack: false, track_expiry: true  },
    { doc_type: 'workmen_compensation',   label: "Workmen's Compensation (WC)",     is_blocking: true,  in_pack: true,  track_expiry: true,  requires_highlight: true },
  ],
  subcontractor_company_worker: [
    { doc_type: 'passport_copy',          label: 'Passport Copy',                   is_blocking: true,  in_pack: true,  track_expiry: true  },
    { doc_type: 'passport_photo',         label: 'Passport Photo',                  is_blocking: true,  in_pack: true,  track_expiry: false },
    { doc_type: 'uae_visa',               label: 'UAE Visa (employer-sponsored)',   is_blocking: true,  in_pack: true,  track_expiry: true  },
    { doc_type: 'emirates_id',            label: 'Emirates ID / National ID',       is_blocking: true,  in_pack: true,  track_expiry: true  },
    { doc_type: 'health_insurance',       label: 'Health Insurance (employer)',     is_blocking: true,  in_pack: false, track_expiry: true,  note: 'Supplier-provided' },
    { doc_type: 'workmen_compensation',   label: "Workmen's Compensation (WC)",     is_blocking: true,  in_pack: true,  track_expiry: true,  requires_highlight: true },
  ]
}

export { DOC_TEMPLATES }

export function getDocumentTemplate(worker) {
  if (worker.entry_track === 'direct_staff') {
    return worker.category === 'Office Staff'
      ? DOC_TEMPLATES.direct_staff_office
      : DOC_TEMPLATES.direct_staff_permanent
  }
  if (worker.entry_track === 'contract_worker') return DOC_TEMPLATES.contract_worker
  if (worker.entry_track === 'subcontractor_company_worker') return DOC_TEMPLATES.subcontractor_company_worker
  return DOC_TEMPLATES.contract_worker
}

export function generateDocumentFilename(worker, docType, originalFilename) {
  const ext = originalFilename ? originalFilename.split('.').pop() : 'pdf'
  const today = new Date()
  const dd = String(today.getDate()).padStart(2,'0')
  const mm = String(today.getMonth()+1).padStart(2,'0')
  const yyyy = today.getFullYear()
  const workerName = (worker.full_name || '').replace(/\s+/g,'-')
  const docLabel = docType.replace(/_/g,'-').replace(/\b\w/g,c=>c.toUpperCase())
  return `${worker.worker_number}_${workerName}_${docLabel}_${dd}${mm}${yyyy}.${ext}`
}

export async function initialiseWorkerDocuments(worker, supabase) {
  const templates = getDocumentTemplate(worker)
  const { data: existing } = await supabase
    .from('documents')
    .select('doc_type')
    .eq('worker_id', worker.id)

  const existingTypes = (existing || []).map(d => d.doc_type)
  const toCreate = templates.filter(t => !existingTypes.includes(t.doc_type))

  if (toCreate.length === 0) return 0

  const rows = toCreate.map(t => ({
    worker_id: worker.id,
    doc_type: t.doc_type,
    label: t.label,
    status: 'missing',
    is_blocking: t.is_blocking,
    file_url: null,
    expiry_date: null,
    highlighted_name_confirmed: false,
    doc_subtype: t.requires_highlight ? 'highlighted_page' : null
  }))

  const { error } = await supabase.from('documents').insert(rows)
  if (error) {
    console.error('initialiseWorkerDocuments error:', error.message)
    return 0
  }
  return rows.length
}
