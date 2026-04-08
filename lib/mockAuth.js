'use client'

export const ROLES = {
  owner: { label:'Owner', description:'Full access to all modules', modules:['dashboard','offers','onboarding','workers','documents','certifications','timesheets','payroll','packs','warnings','leave','inbox','blacklist','setup'] },
  hr_admin: { label:'HR Admin', description:'Full HR access - workers, documents, payroll prep, warnings', modules:['dashboard','offers','onboarding','workers','documents','certifications','timesheets','payroll','packs','warnings','leave','inbox','blacklist'] },
  operations: { label:'Operations', description:'Site operations - workers and timesheets only', modules:['dashboard','workers','timesheets'] }
}

export function getCurrentRole() {
  if (typeof window === 'undefined') return 'owner'
  return localStorage.getItem('iws_role') || 'owner'
}

export function setRole(role) {
  if (typeof window !== 'undefined') localStorage.setItem('iws_role', role)
}

export function canAccess(module) {
  const role = getCurrentRole()
  return ROLES[role]?.modules.includes(module) ?? false
}

export function getRoleLabel() {
  return ROLES[getCurrentRole()]?.label || 'Owner'
}
