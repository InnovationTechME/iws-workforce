/**
 * WhatsApp wa.me click-to-chat bridge — Phase 1.
 * Per IWS_RULES_LOCKED.md §14.
 *
 * Phase 1: wa.me links with pre-filled starter text.
 * Phase 2 (PR #13): Meta Cloud API sends programmatically.
 */

export const STARTERS = {
  payslip_en: "Innovation Technologies — Your {month} payslip is ready. Please find it attached. Net pay: AED {net}. For queries, contact HR at +971 2 333 6633.",
  payslip_hi: "Innovation Technologies — आपकी {month} की payslip तैयार है। कृपया संलग्न देखें। Net: AED {net}. सवाल के लिए HR से संपर्क करें: +971 2 333 6633.",
  general_en: "Innovation Technologies — Message from HR.",
  general_hi: "Innovation Technologies — HR से संदेश।"
}

/**
 * Build a wa.me click-to-chat URL.
 * @param {string} phoneE164 - e.g. '+971 50 123 4567' or '971501234567'
 * @param {string} starterKey - key from STARTERS (e.g. 'payslip_en') or raw text
 * @param {Object} interpolations - e.g. { month: 'March 2026', net: '4,160.00' }
 * @returns {string|null} full https://wa.me/... URL, or null if no phone
 */
export function buildWaLink(phoneE164, starterKey, interpolations = {}) {
  if (!phoneE164) return null
  const num = phoneE164.replace(/\D/g, '')
  if (!num) return null

  let text = STARTERS[starterKey] || starterKey || ''
  for (const [k, v] of Object.entries(interpolations)) {
    text = text.replaceAll(`{${k}}`, v)
  }
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
}

/**
 * Pick the right starter key based on context and preferred language.
 * @param {'payslip'|'general'} context
 * @param {'en'|'hi'} preferredLanguage
 * @returns {string} starter key
 */
export function starterKey(context, preferredLanguage) {
  const lang = preferredLanguage === 'hi' ? 'hi' : 'en'
  return `${context}_${lang}`
}
