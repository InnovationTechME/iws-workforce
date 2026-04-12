import { supabase } from './supabaseClient'

// All holidays ordered by date asc
export async function getPublicHolidays() {
  const { data, error } = await supabase
    .from('public_holidays')
    .select('*')
    .order('date', { ascending: true })
  if (error) throw error
  return data || []
}

// Holidays for a specific year
export async function getPublicHolidaysByYear(year) {
  const { data, error } = await supabase
    .from('public_holidays')
    .select('*')
    .eq('year', year)
    .order('date', { ascending: true })
  if (error) throw error
  return data || []
}

// Returns true if the given YYYY-MM-DD date matches a public holiday.
// Used by payroll calculation — fetches holidays for the relevant year.
export async function isPublicHoliday(dateString) {
  if (!dateString) return false
  const yr = new Date(dateString).getFullYear()
  const { data, error } = await supabase
    .from('public_holidays')
    .select('date')
    .eq('year', yr)
  if (error) throw error
  return (data || []).some(h => h.date === dateString)
}
