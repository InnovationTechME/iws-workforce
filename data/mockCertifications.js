const mockCertifications = [
  // EXPIRED (3) — renewal_required: true
  { id:'cert-001', worker_id:'w-002', certification_type:'Welding Certificate', issuer:'Abu Dhabi Quality & Conformity Council', issue_date:'2024-03-15', expiry_date:'2025-03-15', status:'expired', renewal_required:true, file_url:null },
  { id:'cert-002', worker_id:'w-009', certification_type:'Working at Height', issuer:'NEBOSH Gulf', issue_date:'2024-01-10', expiry_date:'2025-01-10', status:'expired', renewal_required:true, file_url:null },
  { id:'cert-003', worker_id:'w-006', certification_type:'First Aid', issuer:'Red Crescent Authority', issue_date:'2024-06-01', expiry_date:'2025-06-01', status:'expired', renewal_required:true, file_url:null },

  // EXPIRING SOON (3) — within 30 days of 2026-04-08
  { id:'cert-004', worker_id:'w-001', certification_type:'Confined Space Entry', issuer:'ADNOC Approved Training Center', issue_date:'2025-04-20', expiry_date:'2026-04-20', status:'expiring_soon', renewal_required:false, file_url:null },
  { id:'cert-005', worker_id:'w-007', certification_type:'H2S Awareness', issuer:'OPITO Approved Center', issue_date:'2025-05-01', expiry_date:'2026-05-01', status:'expiring_soon', renewal_required:false, file_url:null },
  { id:'cert-006', worker_id:'w-005', certification_type:'First Aid', issuer:'Red Crescent Authority', issue_date:'2025-04-15', expiry_date:'2026-04-15', status:'expiring_soon', renewal_required:false, file_url:null },

  // VALID (6)
  { id:'cert-007', worker_id:'w-001', certification_type:'Working at Height', issuer:'NEBOSH Gulf', issue_date:'2025-10-01', expiry_date:'2027-10-01', status:'valid', renewal_required:false, file_url:null },
  { id:'cert-008', worker_id:'w-003', certification_type:'Rigger/Banksman', issuer:'Leea Approved Center', issue_date:'2025-09-15', expiry_date:'2027-09-15', status:'valid', renewal_required:false, file_url:null },
  { id:'cert-009', worker_id:'w-005', certification_type:'Confined Space Entry', issuer:'ADNOC Approved Training Center', issue_date:'2025-11-01', expiry_date:'2027-11-01', status:'valid', renewal_required:false, file_url:null },
  { id:'cert-010', worker_id:'w-007', certification_type:'Working at Height', issuer:'NEBOSH Gulf', issue_date:'2026-01-15', expiry_date:'2028-01-15', status:'valid', renewal_required:false, file_url:null },
  { id:'cert-011', worker_id:'w-010', certification_type:'H2S Awareness', issuer:'OPITO Approved Center', issue_date:'2025-08-01', expiry_date:'2027-08-01', status:'valid', renewal_required:false, file_url:null },
  { id:'cert-012', worker_id:'w-002', certification_type:'Confined Space Entry', issuer:'ADNOC Approved Training Center', issue_date:'2026-02-01', expiry_date:'2028-02-01', status:'valid', renewal_required:false, file_url:null }
]
export default mockCertifications
