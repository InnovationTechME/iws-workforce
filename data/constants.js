export const NATIONALITIES = [
  'Emirati','Filipino','Indian','Pakistani','Nepali','Ugandan','Nigerian','Ethiopian','Ghanaian','Zambian',
  'Bangladeshi','Sri Lankan','Egyptian','Sudanese','Yemeni','Jordanian','Lebanese','Syrian','Indonesian','Omani','Other'
]

export const POSITIONS = [
  'Electrical Foreman','Electrician','Pipe Fitter','Structural Fabricator','Mechanic',
  'Aluminium Welder','Helper','Welder (FCAW)','Rigger','Scaffolder','Painter','Blaster',
  'Instrument Technician','HSE Officer','Site Engineer','Safety Officer','Driver',
  'Office Admin','HR Officer','PRO','Foreman','Supervisor','Payroll Admin','HR Admin'
]

export const DOCUMENT_CATEGORIES = {
  personal: { label:'Personal Identity', types:['passport','emirates_id','photo','cv'] },
  employment: { label:'Employment Documents', types:['offer_letter','employment_contract','labour_card','labour_permit','bank_account_details'] },
  compliance: { label:'Insurance & Compliance', types:['medical_insurance','workers_compensation','medical_fitness','unemployment_insurance'] },
  site: { label:'Site & Safety', types:['site_induction','safety_orientation','site_access_card'] },
  subcontractor: { label:'Subcontractor Documents', types:['subcontractor_agreement','subcontractor_trade_licence','subcontractor_insurance'] },
  exit: { label:'Termination & Exit', types:['resignation_letter','termination_notice','eos_calculation','exit_clearance','experience_letter','final_payslip'] }
}

export const PACK_DOCUMENT_TYPES = [
  'passport','photo','emirates_id','workers_compensation',
  'medical_fitness','labour_card','labour_permit','site_access_card'
]
