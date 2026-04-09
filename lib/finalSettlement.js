/**
 * Final Settlement Calculator
 * Calculates Full & Final settlement per UAE Labour Law
 * Federal Decree-Law No. 33 of 2021
 */

import { getWorker, getLeaveByWorker } from './mockStore'

export function calculateEOSGratuity(worker, lastWorkingDate) {
  const basicSalary = worker.monthly_salary || 0
  if (!basicSalary) return 0
  const joinDate = new Date(worker.joining_date)
  const exitDate = new Date(lastWorkingDate)
  const totalDays = Math.floor((exitDate - joinDate) / (1000 * 60 * 60 * 24))
  const totalYears = totalDays / 365.25
  if (totalYears < 1) return 0
  const dailyRate = basicSalary / 30
  let gratuity = 0
  if (totalYears <= 5) {
    gratuity = (totalYears * 21) * dailyRate
  } else {
    gratuity = (5 * 21 * dailyRate) + ((totalYears - 5) * 30 * dailyRate)
  }
  return Math.round(gratuity * 100) / 100
}

export function calculateUnusedLeave(worker, lastWorkingDate) {
  const joinDate = new Date(worker.joining_date)
  const exitDate = new Date(lastWorkingDate)
  const serviceYears = (exitDate - joinDate) / (1000 * 60 * 60 * 24 * 365.25)
  const entitledDays = serviceYears >= 1 ? 30 : Math.floor(serviceYears * 30)
  const usedLeave = getLeaveByWorker(worker.id)
    .filter(l => l.leave_type === 'annual' && l.status === 'approved')
    .reduce((sum, l) => sum + (l.days_count || 0), 0)
  const unusedDays = Math.max(0, entitledDays - usedLeave)
  if (unusedDays <= 0) return { days: 0, amount: 0 }
  const dailyRate = worker.monthly_salary ? (worker.monthly_salary / 30) : ((worker.hourly_rate || 0) * 8)
  return { days: unusedDays, amount: Math.round(unusedDays * dailyRate * 100) / 100 }
}

export function calculateOutstandingSalary(worker, lastWorkingDate) {
  const exitDate = new Date(lastWorkingDate)
  const workedDays = exitDate.getDate()
  if (worker.monthly_salary) {
    const dailyRate = worker.monthly_salary / 30
    const basePay = workedDays * dailyRate
    const allowances = ((worker.housing_allowance||0) + (worker.transport_allowance||0) + (worker.food_allowance||0)) * (workedDays / 30)
    return { days: workedDays, basic: Math.round(basePay*100)/100, allowances: Math.round(allowances*100)/100, total: Math.round((basePay+allowances)*100)/100 }
  }
  return { days: workedDays, basic: 0, allowances: 0, total: 0, note: 'Calculate from timesheet hours' }
}

export function calculateDeductions(worker) {
  return { advances: 0, penalties: 0, total: 0 }
}

export function calculateAirTicket(worker, lastWorkingDate) {
  const joinDate = new Date(worker.joining_date)
  const exitDate = new Date(lastWorkingDate)
  const serviceYears = (exitDate - joinDate) / (1000 * 60 * 60 * 24 * 365.25)
  const ticketsDue = Math.floor(serviceYears / 2)
  const ticketCost = 2000
  const ticketsOwed = Math.max(0, ticketsDue)
  return { due: ticketsOwed > 0, count: ticketsOwed, amount: ticketsOwed * ticketCost }
}

export function calculateNoticePay(worker, terminationType, noticeServedDays, noticePeriodRequired) {
  let requiredDays = noticePeriodRequired
  if (!requiredDays) {
    if (terminationType === 'resignation') requiredDays = 60
    else if (terminationType === 'with_notice') requiredDays = 30
    else requiredDays = 0
  }
  if (requiredDays === 0) return { required_days:0, served_days:0, unserved_days:0, amount:0, is_deduction:false, note:'Termination without notice — no notice period' }
  const served = noticeServedDays || 0
  const unserved = Math.max(0, requiredDays - served)
  if (unserved === 0) return { required_days:requiredDays, served_days:served, unserved_days:0, amount:0, is_deduction:false, note:`Notice fully served (${served}/${requiredDays} days)` }
  const dailyRate = worker.monthly_salary ? (worker.monthly_salary / 30) : ((worker.hourly_rate||0) * 8)
  const allowancesDaily = ((worker.housing_allowance||0) + (worker.transport_allowance||0) + (worker.food_allowance||0)) / 30
  const amount = (dailyRate + allowancesDaily) * unserved
  return { required_days:requiredDays, served_days:served, unserved_days:unserved, amount:Math.round(amount*100)/100, is_deduction:true, note:`Unserved notice: ${unserved} days deducted (${served}/${requiredDays} served)` }
}

export function calculateFinalSettlement(workerId, lastWorkingDate, terminationType, noticeServedDays = 0, noticePeriodRequired = null) {
  const worker = getWorker(workerId)
  if (!worker) return null
  const eos = calculateEOSGratuity(worker, lastWorkingDate)
  const unusedLeave = calculateUnusedLeave(worker, lastWorkingDate)
  const outstandingSalary = calculateOutstandingSalary(worker, lastWorkingDate)
  const deductions = calculateDeductions(worker)
  const airTicket = calculateAirTicket(worker, lastWorkingDate)
  const noticePay = calculateNoticePay(worker, terminationType, noticeServedDays, noticePeriodRequired)
  const gross = eos + unusedLeave.amount + outstandingSalary.total + airTicket.amount
  let totalDeductions = deductions.total
  if (noticePay.is_deduction) totalDeductions += noticePay.amount
  const net = gross - totalDeductions
  return {
    worker_id:workerId, worker_name:worker.full_name, worker_number:worker.worker_number,
    last_working_date:lastWorkingDate, termination_type:terminationType,
    breakdown: { eos_gratuity:{amount:eos,calculation:`Based on ${worker.monthly_salary||worker.hourly_rate} AED ${worker.monthly_salary?'basic salary':'hourly rate'}`}, unused_leave:{days:unusedLeave.days,amount:unusedLeave.amount}, outstanding_salary:outstandingSalary, air_ticket:airTicket, notice_period:noticePay, deductions },
    summary: { gross_settlement:Math.round(gross*100)/100, total_deductions:Math.round(totalDeductions*100)/100, net_settlement:Math.round(net*100)/100 },
    calculated_at:new Date().toISOString(), currency:'AED'
  }
}
