const mockDocuments = [
  // w-001: Arun Kumar — 4 documents
  { id:'doc-001', worker_id:'w-001', document_category:'personal', document_type:'passport', issue_date:'2021-05-01', expiry_date:'2026-05-01', status:'expiring_soon', file_url:null, file_name:null, notes:'Passport expiring within 30 days', locked:false, unlock_reason:null },
  { id:'doc-002', worker_id:'w-001', document_category:'personal', document_type:'emirates_id', issue_date:'2024-06-01', expiry_date:'2027-06-01', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-003', worker_id:'w-001', document_category:'compliance', document_type:'medical_insurance', issue_date:'2025-12-01', expiry_date:'2026-12-01', status:'valid', file_url:null, file_name:null, notes:'Daman basic plan', locked:false, unlock_reason:null },
  { id:'doc-004', worker_id:'w-001', document_category:'employment', document_type:'employment_contract', issue_date:'2024-05-10', expiry_date:'2026-05-10', status:'expiring_soon', file_url:null, file_name:null, notes:'Contract renewal due within 42 days', locked:false, unlock_reason:null },

  // w-002: Muhammad Bilal — 4 documents
  { id:'doc-005', worker_id:'w-002', document_category:'compliance', document_type:'workers_compensation', issue_date:'2025-03-01', expiry_date:'2026-03-01', status:'expired', file_url:null, file_name:null, notes:'Workers compensation expired - renewal overdue', locked:false, unlock_reason:null },
  { id:'doc-006', worker_id:'w-002', document_category:'employment', document_type:'labour_card', issue_date:'2025-04-25', expiry_date:'2026-04-25', status:'expiring_soon', file_url:null, file_name:null, notes:'Labour card expiring soon', locked:false, unlock_reason:null },
  { id:'doc-007', worker_id:'w-002', document_category:'personal', document_type:'passport', issue_date:'2022-08-15', expiry_date:'2032-08-15', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-008', worker_id:'w-002', document_category:'personal', document_type:'emirates_id', issue_date:'2025-02-10', expiry_date:'2028-02-10', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },

  // w-003: Joseph Mathew — 4 documents
  { id:'doc-009', worker_id:'w-003', document_category:'personal', document_type:'emirates_id', issue_date:null, expiry_date:null, status:'missing', file_url:null, file_name:null, notes:'Emirates ID not yet submitted', locked:false, unlock_reason:null },
  { id:'doc-010', worker_id:'w-003', document_category:'compliance', document_type:'unemployment_insurance', issue_date:null, expiry_date:null, status:'missing', file_url:null, file_name:null, notes:'Unemployment insurance not provided', locked:false, unlock_reason:null },
  { id:'doc-011', worker_id:'w-003', document_category:'subcontractor', document_type:'subcontractor_agreement', issue_date:'2025-12-01', expiry_date:'2026-12-01', status:'valid', file_url:null, file_name:null, notes:'Al Noor Industrial Services agreement', locked:false, unlock_reason:null },
  { id:'doc-012', worker_id:'w-003', document_category:'personal', document_type:'passport', issue_date:'2020-11-20', expiry_date:'2030-11-20', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },

  // w-004: Fatima Noor — 3 documents
  { id:'doc-013', worker_id:'w-004', document_category:'personal', document_type:'passport', issue_date:'2023-03-10', expiry_date:'2033-03-10', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-014', worker_id:'w-004', document_category:'personal', document_type:'emirates_id', issue_date:'2023-11-20', expiry_date:'2028-11-20', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-015', worker_id:'w-004', document_category:'employment', document_type:'employment_contract', issue_date:'2023-11-20', expiry_date:'2027-11-20', status:'valid', file_url:null, file_name:null, notes:'Original contract from establishment', locked:false, unlock_reason:null },

  // w-005: Ramesh Singh — 3 documents
  { id:'doc-016', worker_id:'w-005', document_category:'personal', document_type:'passport', issue_date:'2022-01-14', expiry_date:'2032-01-14', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-017', worker_id:'w-005', document_category:'compliance', document_type:'medical_insurance', issue_date:'2025-06-01', expiry_date:'2026-06-01', status:'valid', file_url:null, file_name:null, notes:'Daman enhanced plan', locked:false, unlock_reason:null },
  { id:'doc-018', worker_id:'w-005', document_category:'employment', document_type:'labour_card', issue_date:'2024-05-14', expiry_date:'2026-05-14', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },

  // w-006: Naveed Khan — 2 documents
  { id:'doc-019', worker_id:'w-006', document_category:'site', document_type:'site_induction', issue_date:null, expiry_date:null, status:'missing', file_url:null, file_name:null, notes:'Site induction certificate not yet completed', locked:false, unlock_reason:null },
  { id:'doc-020', worker_id:'w-006', document_category:'personal', document_type:'passport', issue_date:'2023-07-01', expiry_date:'2033-07-01', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },

  // w-007: Ahmed Al Rashidi — 4 documents
  { id:'doc-021', worker_id:'w-007', document_category:'subcontractor', document_type:'subcontractor_agreement', issue_date:'2025-08-01', expiry_date:'2027-01-01', status:'valid', file_url:null, file_name:null, notes:'Gulf Pipe Works LLC agreement', locked:false, unlock_reason:null },
  { id:'doc-022', worker_id:'w-007', document_category:'subcontractor', document_type:'subcontractor_insurance', issue_date:'2025-04-30', expiry_date:'2026-04-30', status:'expiring_soon', file_url:null, file_name:null, notes:'Subcontractor insurance expiring within 30 days', locked:false, unlock_reason:null },
  { id:'doc-023', worker_id:'w-007', document_category:'personal', document_type:'passport', issue_date:'2021-09-15', expiry_date:'2031-09-15', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-024', worker_id:'w-007', document_category:'personal', document_type:'emirates_id', issue_date:'2025-08-01', expiry_date:'2028-08-01', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },

  // w-008: Aisha Rahman — 3 documents
  { id:'doc-025', worker_id:'w-008', document_category:'personal', document_type:'passport', issue_date:'2024-02-20', expiry_date:'2034-02-20', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-026', worker_id:'w-008', document_category:'compliance', document_type:'medical_insurance', issue_date:'2025-01-06', expiry_date:'2026-01-06', status:'expired', file_url:null, file_name:null, notes:'Medical insurance expired - renewal pending', locked:false, unlock_reason:null },
  { id:'doc-027', worker_id:'w-008', document_category:'employment', document_type:'employment_contract', issue_date:'2025-01-06', expiry_date:'2027-01-06', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },

  // w-009: Sajith Perera — 2 documents (termination)
  { id:'doc-028', worker_id:'w-009', document_category:'termination', document_type:'exit_clearance', issue_date:'2026-02-28', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'Exit clearance completed on last working day', locked:false, unlock_reason:null },
  { id:'doc-029', worker_id:'w-009', document_category:'termination', document_type:'final_payslip', issue_date:'2026-02-28', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'Final settlement processed', locked:false, unlock_reason:null },

  // w-010: Priya Menon — 1 document
  { id:'doc-030', worker_id:'w-010', document_category:'personal', document_type:'passport', issue_date:'2023-06-01', expiry_date:'2033-06-01', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null }
]
export default mockDocuments
