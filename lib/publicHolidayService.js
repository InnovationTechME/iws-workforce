import { supabase } from './supabaseClient'

function getYearFromDate(dateString) {
  return new Date(dateString + 'T00:00:00').getFullYear()
}

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

export async function addPublicHoliday({ name, date }) {
  const cleanName = String(name || '').trim()
  if (!cleanName || !date) throw new Error('Holiday name and date are required')

  const { data, error } = await supabase
    .from('public_holidays')
    .insert({
      name: cleanName,
      date,
      year: getYearFromDate(date),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removePublicHoliday(id) {
  if (!id) return false
  const { error } = await supabase
    .from('public_holidays')
    .delete()
    .eq('id', id)
  if (error) throw error
  return true
}

// Returns true if the given YYYY-MM-DD date matches a public holiday.
// Used by payroll calculation — fetches holidays for the relevant year.
export async function isPublicHoliday(dateString) {
  if (!dateString) return false
  const yr = getYearFromDate(dateString)
  const { data, error } = await supabase
    .from('public_holidays')
    .select('date')
    .eq('year', yr)
  if (error) throw error
  return (data || []).some(h => h.date === dateString)
}
