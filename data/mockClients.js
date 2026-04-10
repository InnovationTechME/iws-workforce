export const mockClients = [
  { id:'client-001', name:'ADSB', full_name:'Abu Dhabi Ship Building', code:'ADSB', active:true, worker_count:6, current_projects:['Fabrication Yard - Mussafah'], contact_person:'Project Manager', payment_terms:'Monthly', created_date:'2024-10-01' },
  { id:'client-002', name:'Gulf Marine Engineering', full_name:'Gulf Marine Engineering LLC', code:'GME', active:true, worker_count:0, current_projects:['Marine Repair Yard'], contact_person:'Operations Manager', payment_terms:'Monthly', created_date:'2026-03-15' },
  { id:'client-003', name:'Harbor Fit-Out', full_name:'Harbor Fit-Out Contracting LLC', code:'HFC', active:true, worker_count:0, current_projects:['Al Quoz Fit-Out Cluster'], contact_person:'Site Engineer', payment_terms:'Monthly', created_date:'2026-02-01' },
  { id:'client-004', name:'Innovation Technologies', full_name:'Innovation Technologies LLC O.P.C.', code:'HEAD_OFFICE', active:true, worker_count:5, current_projects:['Head Office'], contact_person:'Owner', payment_terms:'N/A', created_date:'2023-01-01' },
]

export function getActiveClients() { return mockClients.filter(c => c.active) }
export function getClientByCode(code) { return mockClients.find(c => c.code === code || c.name === code) }
export function addClient(data) { const c = { id:'client-'+String(mockClients.length+1).padStart(3,'0'), ...data, active:true, worker_count:0, created_date:new Date().toISOString().split('T')[0] }; mockClients.push(c); return c }
