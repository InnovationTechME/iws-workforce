export const mockOffboarding = [
  {
    id: 'off-001',
    worker_id: 'w-009',
    worker_name: 'Sajith Perera',
    worker_number: 'IWS-2026-0009',
    initiated_date: '2026-02-20',
    initiated_by: 'HR Admin',
    reason: 'Resignation',
    last_working_date: '2026-02-28',
    status: 'closed',
    checklist: {
      insurance_cancelled: { done: true, done_by: 'HR Admin', done_at: '2026-02-28' },
      c3_card_cancelled: { done: true, done_by: 'HR Admin', done_at: '2026-02-28' },
      final_payslip_issued: { done: true, done_by: 'HR Admin', done_at: '2026-03-05' },
      eos_calculated: { done: true, done_by: 'Owner', done_at: '2026-03-05' },
      exit_clearance_signed: { done: true, done_by: 'HR Admin', done_at: '2026-02-28' },
      visa_cancellation_initiated: { done: true, done_by: 'HR Admin', done_at: '2026-03-01' },
      labour_card_cancelled: { done: false, done_by: null, done_at: null },
      experience_letter_issued: { done: true, done_by: 'HR Admin', done_at: '2026-03-05' },
    },
    notes: 'Worker resigned voluntarily. All items cleared except labour card cancellation pending MOL.',
    termination_type: 'resignation',
    requires_operations_approval: true,
    operations_approval_status: 'approved',
    operations_approved_by: 'Operations',
    requires_owner_approval: true,
    owner_approval_status: 'approved',
    owner_approved_by: 'Owner',
    can_proceed_with_exit: true
  }
]
