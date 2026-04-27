'use client'

export const ROLES = {
  owner: { label:'Management', description:'Management — Full access, final approvals' },
  hr_admin: { label:'HR Admin', description:'Full HR access - workers, documents, payroll prep, warnings' },
  operations: { label:'Operations', description:'Site operations - workers and timesheets only' },
  accounts: { label:'Accounts', description:'Financial approvals — payroll review, WPS sign-off', badgeColor:'#7c3aed' }
}

export const getRole = () => {
  if (typeof window === 'undefined') return 'owner'
  return localStorage.getItem('iws_role') || 'owner'
}

// Keep backward compat alias
export const getCurrentRole = getRole

export const setRole = (role) => {
  if (typeof window === 'undefined') return
  localStorage.setItem('iws_role', role)
}

export const canAccess = (module) => {
  if (typeof window === 'undefined') return true
  const role = getRole()
  const operationsOnly = ['dashboard','reports','workers','suppliers','timesheets','attendance','payroll-run','pending-approvals']
  const accountsModules = ['dashboard','reports','records','suppliers','payroll','payroll-run','payroll-settings','pending-approvals']
  const ownerOnly = ['payroll_approve','offboarding_close']
  if (role === 'owner') return true
  if (role === 'hr_admin') return !ownerOnly.includes(module)
  if (role === 'operations') return operationsOnly.includes(module)
  if (role === 'accounts') return accountsModules.includes(module)
  return false
}

export const getRoleLabel = () => {
  return ROLES[getRole()]?.label || 'Management'
}
