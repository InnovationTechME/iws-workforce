export const NATIONALITIES = [
  'Emirati', 'British', 'Indian', 'Nepali', 'Pakistani', 'Filipino',
  'Ghanaian', 'Zambian', 'Ethiopian', 'Nigerian', 'Ugandan',
  'Bangladeshi', 'Syrian', 'Sri Lankan', 'Afghan', 'Omani',
  'Other'
]

export const POSITIONS = [
  // Welding
  'Welder (SMAW)','Welder (GMAW)','Welder (FCAW)','Welder (GTAW)','Welder (Combi)',
  // Fabrication
  'Structural Fabricator','Pipe Fabricator','Pipe Fitter','Aluminum Fabricator',
  // Surface Treatment
  'Sand Blaster','Spray Painter',
  // Electrical & Mechanical
  'Electrical Technician','Mechanical Technician','Instrumentation Technician',
  // Supervision & Management
  'Welding Foreman','Fabrication Foreman','Electrical Foreman','Rigger / Banksman','Scaffolder','Foreman (General)','Supervisor',
  // Safety
  'Safety Officer','First Aider',
  // Support
  'Helper','Storekeeper','Driver','Admin / Clerk',
  // Office
  'HR Admin','Payroll Admin','Operations Coordinator','Project Manager','Document Controller','Accountant'
]

export const DOCUMENT_CATEGORIES = {
  personal: { label:'Personal Identity', types:['passport','emirates_id','photo','cv'] },
  employment: { label:'Employment Documents', types:['offer_letter','employment_contract','labour_card','labour_permit','bank_account_details'] },
  compliance: { label:'Insurance & Compliance', types:['medical_insurance','workers_compensation','medical_fitness','unemployment_insurance'] },
  site: { label:'Site & Safety', types:['site_induction','safety_orientation','site_access_card'] },
  subcontractor: { label:'Subcontractor Documents', types:['subcontractor_agreement','subcontractor_trade_licence','subcontractor_insurance'] },
  exit: { label:'Termination & Exit', types:['resignation_letter','termination_notice','eos_calculation','exit_clearance','experience_letter','final_payslip'] }
}

// Pack includes site/compliance docs only — employment_contract deliberately excluded (internal document, not for client packs)
export const PACK_DOCUMENT_TYPES = [
  'passport','photo','emirates_id','workers_compensation',
  'medical_fitness','labour_card','labour_permit','site_access_card'
]
