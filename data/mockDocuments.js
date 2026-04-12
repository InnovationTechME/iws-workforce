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
  { id:'doc-030', worker_id:'w-010', document_category:'personal', document_type:'passport', issue_date:'2023-06-01', expiry_date:'2033-06-01', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },

  // ─── Additional onboarding paper trail ───

  // w-001 Arun Kumar (joined 2024-01-08) — add 6 more
  { id:'doc-031', worker_id:'w-001', document_category:'employment', document_type:'signed_offer_letter', issue_date:'2024-01-01', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'Signed before joining', locked:false, unlock_reason:null },
  { id:'doc-032', worker_id:'w-001', document_category:'compliance', document_type:'medical_fitness', issue_date:'2024-01-05', expiry_date:'2025-01-05', status:'expired', file_url:null, file_name:null, notes:'Renewal due', locked:false, unlock_reason:null },
  { id:'doc-033', worker_id:'w-001', document_category:'employment', document_type:'bank_account_details', issue_date:'2024-01-08', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'Emirates NBD', locked:false, unlock_reason:null },
  { id:'doc-034', worker_id:'w-001', document_category:'employment', document_type:'uae_visa', issue_date:'2024-02-07', expiry_date:'2027-01-07', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-035', worker_id:'w-001', document_category:'compliance', document_type:'iloe_certificate', issue_date:'2024-02-07', expiry_date:'2027-01-07', status:'valid', file_url:null, file_name:null, notes:'ILOE-2026-001', locked:false, unlock_reason:null },
  { id:'doc-036', worker_id:'w-001', document_category:'site', document_type:'site_induction', issue_date:'2024-01-15', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'Expo Residence Tower', locked:false, unlock_reason:null },

  // w-002 Muhammad Bilal (joined 2025-02-02) — add 7 more (total 11)
  { id:'doc-037', worker_id:'w-002', document_category:'employment', document_type:'signed_offer_letter', issue_date:'2025-01-26', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'Signed and witnessed', locked:false, unlock_reason:null },
  { id:'doc-038', worker_id:'w-002', document_category:'compliance', document_type:'medical_fitness', issue_date:'2025-01-30', expiry_date:'2026-01-30', status:'expired', file_url:null, file_name:null, notes:'Renewal pending', locked:false, unlock_reason:null },
  { id:'doc-039', worker_id:'w-002', document_category:'employment', document_type:'bank_account_details', issue_date:'2025-02-02', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'ADCB', locked:false, unlock_reason:null },
  { id:'doc-040', worker_id:'w-002', document_category:'compliance', document_type:'medical_insurance', issue_date:'2025-02-02', expiry_date:'2026-02-02', status:'expired', file_url:null, file_name:null, notes:'Daman basic — renewal overdue', locked:false, unlock_reason:null },
  { id:'doc-041', worker_id:'w-002', document_category:'employment', document_type:'uae_visa', issue_date:'2025-03-04', expiry_date:'2027-02-01', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-042', worker_id:'w-002', document_category:'compliance', document_type:'iloe_certificate', issue_date:'2025-03-04', expiry_date:'2027-02-01', status:'valid', file_url:null, file_name:null, notes:'ILOE-2026-002', locked:false, unlock_reason:null },
  { id:'doc-043', worker_id:'w-002', document_category:'site', document_type:'site_induction', issue_date:'2025-02-05', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'Dubai South Logistics', locked:false, unlock_reason:null },

  // w-003 Joseph Mathew (joined 2025-03-11, subcontract) — add 4 more
  { id:'doc-044', worker_id:'w-003', document_category:'employment', document_type:'signed_offer_letter', issue_date:'2025-03-04', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'Via Al Noor Industrial', locked:false, unlock_reason:null },
  { id:'doc-045', worker_id:'w-003', document_category:'compliance', document_type:'medical_fitness', issue_date:'2025-03-08', expiry_date:'2026-03-08', status:'expired', file_url:null, file_name:null, notes:'Renewal required', locked:false, unlock_reason:null },
  { id:'doc-046', worker_id:'w-003', document_category:'employment', document_type:'bank_account_details', issue_date:'2025-03-11', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'Mashreq', locked:false, unlock_reason:null },
  { id:'doc-047', worker_id:'w-003', document_category:'subcontractor', document_type:'subcontractor_insurance', issue_date:'2025-12-01', expiry_date:'2026-12-01', status:'valid', file_url:null, file_name:null, notes:'Gulf Insurance Group', locked:false, unlock_reason:null },

  // w-004 Fatima Noor (joined 2023-11-20, office) — add 6 more
  { id:'doc-048', worker_id:'w-004', document_category:'employment', document_type:'signed_offer_letter', issue_date:'2023-11-13', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-049', worker_id:'w-004', document_category:'compliance', document_type:'medical_fitness', issue_date:'2023-11-17', expiry_date:'2024-11-17', status:'expired', file_url:null, file_name:null, notes:'Renewal overdue', locked:false, unlock_reason:null },
  { id:'doc-050', worker_id:'w-004', document_category:'employment', document_type:'bank_account_details', issue_date:'2023-11-20', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'Emirates NBD', locked:false, unlock_reason:null },
  { id:'doc-051', worker_id:'w-004', document_category:'compliance', document_type:'medical_insurance', issue_date:'2025-11-20', expiry_date:'2026-11-20', status:'valid', file_url:null, file_name:null, notes:'Daman enhanced', locked:false, unlock_reason:null },
  { id:'doc-052', worker_id:'w-004', document_category:'employment', document_type:'uae_visa', issue_date:'2023-12-20', expiry_date:'2028-11-19', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-053', worker_id:'w-004', document_category:'compliance', document_type:'iloe_certificate', issue_date:'2023-12-20', expiry_date:'2028-11-19', status:'valid', file_url:null, file_name:null, notes:'ILOE-2026-004', locked:false, unlock_reason:null },

  // w-005 Ramesh Singh (joined 2024-05-14) — add 8 more
  { id:'doc-054', worker_id:'w-005', document_category:'personal', document_type:'emirates_id', issue_date:'2024-06-14', expiry_date:'2026-05-13', status:'expiring_soon', file_url:null, file_name:null, notes:'Renewal due within 30 days', locked:false, unlock_reason:null },
  { id:'doc-055', worker_id:'w-005', document_category:'employment', document_type:'signed_offer_letter', issue_date:'2024-05-07', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-056', worker_id:'w-005', document_category:'compliance', document_type:'medical_fitness', issue_date:'2024-05-11', expiry_date:'2025-05-11', status:'expired', file_url:null, file_name:null, notes:'Renewal required', locked:false, unlock_reason:null },
  { id:'doc-057', worker_id:'w-005', document_category:'employment', document_type:'bank_account_details', issue_date:'2024-05-14', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'HSBC', locked:false, unlock_reason:null },
  { id:'doc-058', worker_id:'w-005', document_category:'employment', document_type:'uae_visa', issue_date:'2024-06-13', expiry_date:'2026-05-13', status:'expiring_soon', file_url:null, file_name:null, notes:'Visa renewal due', locked:false, unlock_reason:null },
  { id:'doc-059', worker_id:'w-005', document_category:'compliance', document_type:'iloe_certificate', issue_date:'2024-06-13', expiry_date:'2026-05-13', status:'expiring_soon', file_url:null, file_name:null, notes:'ILOE-2026-005', locked:false, unlock_reason:null },
  { id:'doc-060', worker_id:'w-005', document_category:'site', document_type:'site_induction', issue_date:'2024-05-20', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'Dubai South Logistics', locked:false, unlock_reason:null },
  { id:'doc-061', worker_id:'w-005', document_category:'employment', document_type:'employment_contract', issue_date:'2024-05-14', expiry_date:'2026-05-14', status:'expiring_soon', file_url:null, file_name:null, notes:'Renewal due', locked:false, unlock_reason:null },

  // w-006 Naveed Khan (joined 2026-03-18) — add 8 more
  { id:'doc-062', worker_id:'w-006', document_category:'personal', document_type:'emirates_id', issue_date:'2026-04-17', expiry_date:'2027-03-17', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-063', worker_id:'w-006', document_category:'employment', document_type:'signed_offer_letter', issue_date:'2026-03-11', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-064', worker_id:'w-006', document_category:'compliance', document_type:'medical_fitness', issue_date:'2026-03-15', expiry_date:'2027-03-15', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-065', worker_id:'w-006', document_category:'employment', document_type:'bank_account_details', issue_date:'2026-03-18', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'Emirates NBD', locked:false, unlock_reason:null },
  { id:'doc-066', worker_id:'w-006', document_category:'compliance', document_type:'medical_insurance', issue_date:'2026-03-18', expiry_date:'2027-03-18', status:'valid', file_url:null, file_name:null, notes:'Daman basic', locked:false, unlock_reason:null },
  { id:'doc-067', worker_id:'w-006', document_category:'employment', document_type:'uae_visa', issue_date:'2026-04-17', expiry_date:'2027-03-17', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-068', worker_id:'w-006', document_category:'compliance', document_type:'iloe_certificate', issue_date:null, expiry_date:null, status:'missing', file_url:null, file_name:null, notes:'ILOE certificate pending', locked:false, unlock_reason:null },
  { id:'doc-069', worker_id:'w-006', document_category:'employment', document_type:'employment_contract', issue_date:'2026-03-18', expiry_date:'2028-03-18', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },

  // w-007 Ahmed Al Rashidi (joined 2025-08-01, subcontract) — add 4 more
  { id:'doc-070', worker_id:'w-007', document_category:'employment', document_type:'signed_offer_letter', issue_date:'2025-07-25', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'Via Gulf Pipe Works', locked:false, unlock_reason:null },
  { id:'doc-071', worker_id:'w-007', document_category:'compliance', document_type:'medical_fitness', issue_date:'2025-07-29', expiry_date:'2026-07-29', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-072', worker_id:'w-007', document_category:'employment', document_type:'bank_account_details', issue_date:'2025-08-01', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'Subcontractor direct payment', locked:false, unlock_reason:null },
  { id:'doc-073', worker_id:'w-007', document_category:'site', document_type:'site_induction', issue_date:'2025-08-05', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'Marine Repair Yard', locked:false, unlock_reason:null },

  // w-008 Aisha Rahman (joined 2025-01-06, office) — add 6 more
  { id:'doc-074', worker_id:'w-008', document_category:'personal', document_type:'emirates_id', issue_date:'2025-02-05', expiry_date:'2027-01-05', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-075', worker_id:'w-008', document_category:'employment', document_type:'signed_offer_letter', issue_date:'2024-12-30', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-076', worker_id:'w-008', document_category:'compliance', document_type:'medical_fitness', issue_date:'2025-01-03', expiry_date:'2026-01-03', status:'expired', file_url:null, file_name:null, notes:'Renewal required', locked:false, unlock_reason:null },
  { id:'doc-077', worker_id:'w-008', document_category:'employment', document_type:'bank_account_details', issue_date:'2025-01-06', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'Emirates NBD', locked:false, unlock_reason:null },
  { id:'doc-078', worker_id:'w-008', document_category:'employment', document_type:'uae_visa', issue_date:'2025-02-05', expiry_date:'2027-01-05', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-079', worker_id:'w-008', document_category:'compliance', document_type:'iloe_certificate', issue_date:'2025-02-05', expiry_date:'2026-05-01', status:'expiring_soon', file_url:null, file_name:null, notes:'ILOE renewal due', locked:false, unlock_reason:null },

  // w-010 Priya Menon (joined 2025-06-01) — add 8 more
  { id:'doc-080', worker_id:'w-010', document_category:'personal', document_type:'emirates_id', issue_date:'2025-07-01', expiry_date:'2027-05-31', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-081', worker_id:'w-010', document_category:'employment', document_type:'signed_offer_letter', issue_date:'2025-05-25', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-082', worker_id:'w-010', document_category:'compliance', document_type:'medical_fitness', issue_date:'2025-05-29', expiry_date:'2026-05-29', status:'expiring_soon', file_url:null, file_name:null, notes:'Renewal due within 60 days', locked:false, unlock_reason:null },
  { id:'doc-083', worker_id:'w-010', document_category:'employment', document_type:'bank_account_details', issue_date:'2025-06-01', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'FAB', locked:false, unlock_reason:null },
  { id:'doc-084', worker_id:'w-010', document_category:'compliance', document_type:'medical_insurance', issue_date:'2025-06-01', expiry_date:'2026-06-01', status:'expiring_soon', file_url:null, file_name:null, notes:'Daman enhanced', locked:false, unlock_reason:null },
  { id:'doc-085', worker_id:'w-010', document_category:'employment', document_type:'uae_visa', issue_date:'2025-07-01', expiry_date:'2027-05-31', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-086', worker_id:'w-010', document_category:'compliance', document_type:'iloe_certificate', issue_date:'2025-07-01', expiry_date:'2027-05-31', status:'valid', file_url:null, file_name:null, notes:'ILOE-2026-010', locked:false, unlock_reason:null },
  { id:'doc-087', worker_id:'w-010', document_category:'employment', document_type:'employment_contract', issue_date:'2025-06-01', expiry_date:'2027-06-01', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },

  // ─── Medical insurance for subcontract workers (per policy: all workers covered) ───
  { id:'doc-088', worker_id:'w-003', document_category:'compliance', document_type:'medical_insurance', issue_date:'2025-03-11', expiry_date:'2026-03-11', status:'expired', file_url:null, file_name:null, notes:'Via subcontractor — renewal pending', locked:false, unlock_reason:null },
  { id:'doc-089', worker_id:'w-007', document_category:'compliance', document_type:'medical_insurance', issue_date:'2025-08-01', expiry_date:'2026-08-01', status:'valid', file_url:null, file_name:null, notes:'Via Gulf Pipe Works group plan', locked:false, unlock_reason:null },

  // ─── w-011 Moktader Bilia Suman (joined 2024-11-01, Contract, ADSB) — 8 docs ───
  { id:'doc-090', worker_id:'w-011', document_category:'personal', document_type:'passport', issue_date:'2020-07-01', expiry_date:'2027-06-30', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-091', worker_id:'w-011', document_category:'personal', document_type:'emirates_id', issue_date:'2024-12-01', expiry_date:'2027-11-01', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-092', worker_id:'w-011', document_category:'employment', document_type:'signed_offer_letter', issue_date:'2024-10-25', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-093', worker_id:'w-011', document_category:'compliance', document_type:'medical_fitness', issue_date:'2024-10-29', expiry_date:'2025-10-29', status:'expired', file_url:null, file_name:null, notes:'Renewal required', locked:false, unlock_reason:null },
  { id:'doc-094', worker_id:'w-011', document_category:'employment', document_type:'bank_account_details', issue_date:'2024-11-01', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'Emirates NBD', locked:false, unlock_reason:null },
  { id:'doc-095', worker_id:'w-011', document_category:'compliance', document_type:'medical_insurance', issue_date:'2024-11-01', expiry_date:'2025-11-01', status:'expired', file_url:null, file_name:null, notes:'Daman basic — renewal overdue', locked:false, unlock_reason:null },
  { id:'doc-096', worker_id:'w-011', document_category:'employment', document_type:'uae_visa', issue_date:'2024-12-01', expiry_date:'2026-11-01', status:'expiring_soon', file_url:null, file_name:null, notes:'Visa renewal due', locked:false, unlock_reason:null },
  { id:'doc-097', worker_id:'w-011', document_category:'site', document_type:'site_induction', issue_date:'2024-11-05', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'ADSB Fabrication Yard', locked:false, unlock_reason:null },

  // ─── w-012 Md Sohel Rana Islam (joined 2024-12-15, Contract, ADSB) — 8 docs ───
  { id:'doc-098', worker_id:'w-012', document_category:'personal', document_type:'passport', issue_date:'2020-08-15', expiry_date:'2027-08-15', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-099', worker_id:'w-012', document_category:'personal', document_type:'emirates_id', issue_date:'2025-01-15', expiry_date:'2027-12-15', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-100', worker_id:'w-012', document_category:'employment', document_type:'signed_offer_letter', issue_date:'2024-12-08', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-101', worker_id:'w-012', document_category:'compliance', document_type:'medical_fitness', issue_date:'2024-12-12', expiry_date:'2025-12-12', status:'expired', file_url:null, file_name:null, notes:'Renewal required', locked:false, unlock_reason:null },
  { id:'doc-102', worker_id:'w-012', document_category:'employment', document_type:'bank_account_details', issue_date:'2024-12-15', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'ADCB', locked:false, unlock_reason:null },
  { id:'doc-103', worker_id:'w-012', document_category:'compliance', document_type:'medical_insurance', issue_date:'2024-12-15', expiry_date:'2025-12-15', status:'expired', file_url:null, file_name:null, notes:'Renewal overdue', locked:false, unlock_reason:null },
  { id:'doc-104', worker_id:'w-012', document_category:'employment', document_type:'uae_visa', issue_date:'2025-01-15', expiry_date:'2026-12-15', status:'expiring_soon', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-105', worker_id:'w-012', document_category:'site', document_type:'site_induction', issue_date:'2024-12-18', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'ADSB Fabrication Yard', locked:false, unlock_reason:null },

  // ─── w-013 Md Biplob Hossain (joined 2024-10-01, Contract, ADSB) — 8 docs ───
  { id:'doc-106', worker_id:'w-013', document_category:'personal', document_type:'passport', issue_date:'2020-05-20', expiry_date:'2027-05-20', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-107', worker_id:'w-013', document_category:'personal', document_type:'emirates_id', issue_date:'2024-11-01', expiry_date:'2027-10-01', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-108', worker_id:'w-013', document_category:'employment', document_type:'signed_offer_letter', issue_date:'2024-09-24', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-109', worker_id:'w-013', document_category:'compliance', document_type:'medical_fitness', issue_date:'2024-09-28', expiry_date:'2025-09-28', status:'expired', file_url:null, file_name:null, notes:'Renewal required', locked:false, unlock_reason:null },
  { id:'doc-110', worker_id:'w-013', document_category:'employment', document_type:'bank_account_details', issue_date:'2024-10-01', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'Emirates NBD', locked:false, unlock_reason:null },
  { id:'doc-111', worker_id:'w-013', document_category:'compliance', document_type:'medical_insurance', issue_date:'2024-10-01', expiry_date:'2025-10-01', status:'expired', file_url:null, file_name:null, notes:'Renewal overdue', locked:false, unlock_reason:null },
  { id:'doc-112', worker_id:'w-013', document_category:'employment', document_type:'uae_visa', issue_date:'2024-11-01', expiry_date:'2026-10-01', status:'expiring_soon', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-113', worker_id:'w-013', document_category:'site', document_type:'site_induction', issue_date:'2024-10-05', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'ADSB Fabrication Yard', locked:false, unlock_reason:null },

  // ─── w-014 Md Nazim Shanto (joined 2024-11-15, Contract, ADSB) — 8 docs ───
  { id:'doc-114', worker_id:'w-014', document_category:'personal', document_type:'passport', issue_date:'2020-09-10', expiry_date:'2027-09-10', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-115', worker_id:'w-014', document_category:'personal', document_type:'emirates_id', issue_date:'2024-12-15', expiry_date:'2027-11-15', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-116', worker_id:'w-014', document_category:'employment', document_type:'signed_offer_letter', issue_date:'2024-11-08', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-117', worker_id:'w-014', document_category:'compliance', document_type:'medical_fitness', issue_date:'2024-11-12', expiry_date:'2025-11-12', status:'expired', file_url:null, file_name:null, notes:'Renewal required', locked:false, unlock_reason:null },
  { id:'doc-118', worker_id:'w-014', document_category:'employment', document_type:'bank_account_details', issue_date:'2024-11-15', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'ADCB', locked:false, unlock_reason:null },
  { id:'doc-119', worker_id:'w-014', document_category:'compliance', document_type:'medical_insurance', issue_date:'2024-11-15', expiry_date:'2025-11-15', status:'expired', file_url:null, file_name:null, notes:'Renewal overdue', locked:false, unlock_reason:null },
  { id:'doc-120', worker_id:'w-014', document_category:'employment', document_type:'uae_visa', issue_date:'2024-12-15', expiry_date:'2026-11-15', status:'expiring_soon', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-121', worker_id:'w-014', document_category:'site', document_type:'site_induction', issue_date:'2024-11-18', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'ADSB Fabrication Yard', locked:false, unlock_reason:null },

  // ─── w-015 Abu Munsur (joined 2024-09-01, Contract, ADSB) — 8 docs ───
  { id:'doc-122', worker_id:'w-015', document_category:'personal', document_type:'passport', issue_date:'2020-04-25', expiry_date:'2027-04-25', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-123', worker_id:'w-015', document_category:'personal', document_type:'emirates_id', issue_date:'2024-10-01', expiry_date:'2027-09-01', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-124', worker_id:'w-015', document_category:'employment', document_type:'signed_offer_letter', issue_date:'2024-08-25', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-125', worker_id:'w-015', document_category:'compliance', document_type:'medical_fitness', issue_date:'2024-08-29', expiry_date:'2025-08-29', status:'expired', file_url:null, file_name:null, notes:'Renewal required', locked:false, unlock_reason:null },
  { id:'doc-126', worker_id:'w-015', document_category:'employment', document_type:'bank_account_details', issue_date:'2024-09-01', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'Mashreq', locked:false, unlock_reason:null },
  { id:'doc-127', worker_id:'w-015', document_category:'compliance', document_type:'medical_insurance', issue_date:'2024-09-01', expiry_date:'2025-09-01', status:'expired', file_url:null, file_name:null, notes:'Renewal overdue', locked:false, unlock_reason:null },
  { id:'doc-128', worker_id:'w-015', document_category:'employment', document_type:'uae_visa', issue_date:'2024-10-01', expiry_date:'2026-09-01', status:'expiring_soon', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-129', worker_id:'w-015', document_category:'site', document_type:'site_induction', issue_date:'2024-09-05', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'ADSB Fabrication Yard', locked:false, unlock_reason:null },

  // ─── w-016 Bipul Hasan (joined 2024-10-15, Contract, ADSB) — 8 docs ───
  { id:'doc-130', worker_id:'w-016', document_category:'personal', document_type:'passport', issue_date:'2020-11-30', expiry_date:'2027-11-30', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-131', worker_id:'w-016', document_category:'personal', document_type:'emirates_id', issue_date:'2024-11-15', expiry_date:'2027-10-15', status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-132', worker_id:'w-016', document_category:'employment', document_type:'signed_offer_letter', issue_date:'2024-10-08', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-133', worker_id:'w-016', document_category:'compliance', document_type:'medical_fitness', issue_date:'2024-10-12', expiry_date:'2025-10-12', status:'expired', file_url:null, file_name:null, notes:'Renewal required', locked:false, unlock_reason:null },
  { id:'doc-134', worker_id:'w-016', document_category:'employment', document_type:'bank_account_details', issue_date:'2024-10-15', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'Emirates NBD', locked:false, unlock_reason:null },
  { id:'doc-135', worker_id:'w-016', document_category:'compliance', document_type:'medical_insurance', issue_date:'2024-10-15', expiry_date:'2025-10-15', status:'expired', file_url:null, file_name:null, notes:'Renewal overdue', locked:false, unlock_reason:null },
  { id:'doc-136', worker_id:'w-016', document_category:'employment', document_type:'uae_visa', issue_date:'2024-11-15', expiry_date:'2026-10-15', status:'expiring_soon', file_url:null, file_name:null, notes:null, locked:false, unlock_reason:null },
  { id:'doc-137', worker_id:'w-016', document_category:'site', document_type:'site_induction', issue_date:'2024-10-18', expiry_date:null, status:'valid', file_url:null, file_name:null, notes:'ADSB Fabrication Yard', locked:false, unlock_reason:null }
]
export default mockDocuments
