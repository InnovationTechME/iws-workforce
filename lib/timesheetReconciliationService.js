const storageKey = (headerId) => `iws.timesheetReconciliation.${headerId}`

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function loadReconciliationReview(headerId) {
  if (!headerId || !canUseLocalStorage()) return null
  try {
    const raw = window.localStorage.getItem(storageKey(headerId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveReconciliationReview(headerId, review) {
  if (!headerId || !canUseLocalStorage()) return null
  const payload = {
    ...review,
    saved_at: new Date().toISOString(),
  }
  try {
    window.localStorage.setItem(storageKey(headerId), JSON.stringify(payload))
    return payload
  } catch {
    return null
  }
}

export function clearReconciliationReview(headerId) {
  if (!headerId || !canUseLocalStorage()) return
  window.localStorage.removeItem(storageKey(headerId))
}
