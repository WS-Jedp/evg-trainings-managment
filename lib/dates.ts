import { differenceInCalendarISOWeeks } from 'date-fns'

/** Calculate subscription end: same day next month, stored at midnight UTC */
export function calcSubscriptionEnd(start: Date): Date {
  const targetDay = start.getUTCDate()
  const year = start.getUTCFullYear()
  const month = start.getUTCMonth()

  // Calculate next month
  let nextMonth = month + 1
  let nextYear = year
  if (nextMonth > 11) {
    nextMonth = 0
    nextYear += 1
  }

  // Create date for first day of next month
  const result = new Date(Date.UTC(nextYear, nextMonth, 1))

  // Calculate days in next month
  const daysInNextMonth = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate()

  // Set to target day or last day of month, whichever is smaller
  result.setUTCDate(Math.min(targetDay, daysInNextMonth))

  return startOfDayUTC(result)
}

/** Return midnight UTC for any date */
export function startOfDayUTC(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/** Full ISO weeks elapsed between subscriptionStart and today (0 if < 1 week) */
export function isoWeeksElapsed(start: Date, today: Date): number {
  return Math.max(0, differenceInCalendarISOWeeks(today, start))
}

/** Format a date as "YYYY-MM" for PaymentRecord.period */
export function formatPeriod(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}
