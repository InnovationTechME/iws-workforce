export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'passport_copy', label: 'Passport Copy', expiryRequired: true },
  { value: 'passport_photo', label: 'Passport Photo', expiryRequired: false },
  { value: 'emirates_id', label: 'Emirates ID', expiryRequired: true },
  { value: 'uae_visa', label: 'UAE Visa', expiryRequired: true },
  { value: 'medical_fitness', label: 'Medical Fitness', expiryRequired: false },
  { value: 'labour_card', label: 'IT Labour Card / MOHRE', expiryRequired: true },
  { value: 'health_insurance', label: 'Health Insurance', expiryRequired: true },
  { value: 'workmen_compensation', label: "Workmen's Compensation", expiryRequired: true },
  { value: 'offer_letter', label: 'Offer Letter', expiryRequired: false },
  { value: 'employment_contract', label: 'Employment Contract', expiryRequired: false },
  { value: 'iloe_certificate', label: 'ILOE Certificate', expiryRequired: true },
  { value: 'worker_policy_manual', label: 'Worker Policy Manual', expiryRequired: false },
  { value: 'passport_safekeeping', label: 'Passport Safekeeping', expiryRequired: false },
  { value: 'site_induction', label: 'Site Induction', expiryRequired: false },
  { value: 'safety_orientation', label: 'Safety Orientation', expiryRequired: false },
  { value: 'site_access_card', label: 'Site Access Card', expiryRequired: true },
  { value: 'subcontractor_agreement', label: 'Subcontractor Agreement', expiryRequired: false },
  { value: 'subcontractor_trade_licence', label: 'Subcontractor Trade Licence', expiryRequired: true },
  { value: 'subcontractor_insurance', label: 'Subcontractor Insurance', expiryRequired: true },
  { value: 'resignation_letter', label: 'Resignation Letter', expiryRequired: false },
  { value: 'termination_notice', label: 'Termination Notice', expiryRequired: false },
  { value: 'eos_calculation', label: 'EOS Calculation', expiryRequired: false },
  { value: 'exit_clearance', label: 'Exit Clearance', expiryRequired: false },
  { value: 'final_payslip', label: 'Final Payslip', expiryRequired: false },
  { value: 'experience_letter', label: 'Experience Letter', expiryRequired: false },
]

const LEGACY_DOCUMENT_TYPE_MAP = {
  passport: 'passport_copy',
  visa: 'uae_visa',
  photo: 'passport_photo',
  medical_insurance: 'health_insurance',
  workers_compensation: 'workmen_compensation',
  labour_contract: 'employment_contract',
  labour_permit: 'labour_card',
  unemployment_insurance: 'iloe_certificate',
}

export function normalizeDocumentType(docType) {
  return LEGACY_DOCUMENT_TYPE_MAP[docType] || docType
}

export function getDocumentTypeOption(docType) {
  const normalised = normalizeDocumentType(docType)
  return DOCUMENT_TYPE_OPTIONS.find(option => option.value === normalised) || {
    value: normalised,
    label: normalised.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    expiryRequired: true,
  }
}

export function isDocumentExpiryRequired(docType) {
  return getDocumentTypeOption(docType).expiryRequired
}
