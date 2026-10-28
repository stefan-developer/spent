import { useMemo } from 'react'
import {
  addMonths,
  MONTHS_LOC,
  MONTHS_NOM,
  MONTHS_SHORT,
  todayStr,
  toYMD,
  type Month,
} from './format'
import { useSettings, type Settings } from './settings'

/**
 * How time is cut into periods: calendar months (the 1st to the last day) or
 * salary to salary (payday to the day before the next one). A period is
 * identified by the Month it's named after — the month itself, or the month
 * the salary is for — so expenses (plain dates) never change, only the window.
 */
export interface PeriodCfg {
  salary: boolean
  day: number // first day of every period: 1, or the payday (clamped in short months)
  lag: number // the salary for month M arrives in month M + lag (0 or 1)
}

export const CALENDAR: PeriodCfg = { salary: false, day: 1, lag: 0 }

export const periodCfg = (s: Settings): PeriodCfg =>
  s.salary && s.view === 'salary'
    ? { salary: true, day: s.salary.day, lag: s.salary.forPrevMonth ? 1 : 0 }
    : CALENDAR

export function usePeriodCfg(): PeriodCfg {
  const settings = useSettings()
  return useMemo(() => periodCfg(settings), [settings])
}

export const sameCfg = (a: PeriodCfg, b: PeriodCfg) =>
  a.salary === b.salary && a.day === b.day && a.lag === b.lag

export interface Range {
  start: string // YYYY-MM-DD, inclusive
  end: string // YYYY-MM-DD, inclusive
  days: number
}

const DAY_MS = 86_400_000

const parseYMD = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Whole days from a to b — rounded, so DST shifts don't matter. */
const daysBetween = (a: string, b: string) =>
  Math.round((parseYMD(b).getTime() - parseYMD(a).getTime()) / DAY_MS)

function startDate(p: Month, cfg: PeriodCfg): Date {
  const { year, month } = addMonths(p, cfg.lag)
  const len = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(cfg.day, len))
}

export function periodRange(p: Month, cfg: PeriodCfg): Range {
  const start = startDate(p, cfg)
  const next = startDate(addMonths(p, 1), cfg)
  const end = new Date(next.getFullYear(), next.getMonth(), next.getDate() - 1)
  return {
    start: toYMD(start),
    end: toYMD(end),
    days: Math.round((next.getTime() - start.getTime()) / DAY_MS),
  }
}

/** The period a date falls in. */
export function periodOf(ymd: string, cfg: PeriodCfg): Month {
  const [y, m] = ymd.split('-').map(Number)
  const p = addMonths({ year: y, month: m - 1 }, -cfg.lag)
  return ymd < periodRange(p, cfg).start ? addMonths(p, -1) : p
}

export const currentPeriod = (cfg: PeriodCfg) => periodOf(todayStr(), cfg)

/** Days of r up to and including today: 0 for a future period, all of them for a past one. */
export function elapsedDays(r: Range): number {
  const today = todayStr()
  if (today < r.start) return 0
  if (today > r.end) return r.days
  return daysBetween(r.start, today) + 1
}

/** Days until the next period begins (1 = tomorrow); null unless r is under way. */
export function daysLeft(r: Range): number | null {
  const today = todayStr()
  return today < r.start || today > r.end ? null : daysBetween(today, r.end) + 1
}

/** Where a new entry lands by default: today, or inside the period on screen. */
export function defaultDateFor(p: Month, cfg: PeriodCfg): string {
  const r = periodRange(p, cfg)
  const today = todayStr()
  if (today < r.start) return r.start
  if (today > r.end) return r.end
  return today
}

/** The same point in time through another cut: today if p is under way, else p's middle. */
export function remapPeriod(p: Month, from: PeriodCfg, to: PeriodCfg): Month {
  const r = periodRange(p, from)
  const today = todayStr()
  if (today >= r.start && today <= r.end) return periodOf(today, to)
  const mid = parseYMD(r.start)
  mid.setDate(mid.getDate() + Math.floor(r.days / 2))
  return periodOf(toYMD(mid), to)
}

// ---------- labels ----------

// "oktobarsk" + a plata / e plate / u platu
const ADJ = [
  'januarsk',
  'februarsk',
  'martovsk',
  'aprilsk',
  'majsk',
  'junsk',
  'julsk',
  'avgustovsk',
  'septembarsk',
  'oktobarsk',
  'novembarsk',
  'decembarsk',
]

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** " 2025." for a period outside this year's run, else "". */
export const yearSuffix = (p: Month, cfg: PeriodCfg) =>
  p.year === currentPeriod(cfg).year ? '' : ` ${p.year}.`

/** "Oktobarska" — month index 0–11. */
export const salaryAdj = (month: number) => `${cap(ADJ[month])}a`

/** "Oktobarska plata" */
export const salaryName = (p: Month) => `${salaryAdj(p.month)} plata`

/** "Oktobar" / "Oktobarska plata" */
export const periodName = (p: Month, cfg: PeriodCfg) =>
  cfg.salary ? salaryName(p) : MONTHS_NOM[p.month]

/** periodName plus the year when it isn't this one. */
export const periodTitle = (p: Month, cfg: PeriodCfg) => periodName(p, cfg) + yearSuffix(p, cfg)

/** After "Potrošeno": "u oktobru" / "od oktobarske plate". */
export const periodPhrase = (p: Month, cfg: PeriodCfg) =>
  (cfg.salary ? `od ${ADJ[p.month]}e plate` : `u ${MONTHS_LOC[p.month]}`) + yearSuffix(p, cfg)

/** After "za" / "u": "oktobar" / "oktobarsku platu". */
export const periodAcc = (p: Month, cfg: PeriodCfg) =>
  (cfg.salary ? `${ADJ[p.month]}u platu` : MONTHS_NOM[p.month].toLowerCase()) +
  yearSuffix(p, cfg)

/** The period before p, after "nego": "u septembru" / "od prošle plate". */
export const prevPhrase = (p: Month, cfg: PeriodCfg) =>
  cfg.salary ? 'od prošle plate' : `u ${MONTHS_LOC[addMonths(p, -1).month]}`

const shortDate = (ymd: string, withYear: boolean) => {
  const [y, m, d] = ymd.split('-').map(Number)
  return `${d}. ${MONTHS_SHORT[m - 1]}${withYear ? ` ${y}.` : ''}`
}

/** "10. okt – 9. nov"; years only where they aren't this one. */
export function rangeLabel(r: Range): string {
  const thisYear = new Date().getFullYear()
  const sy = Number(r.start.slice(0, 4))
  const ey = Number(r.end.slice(0, 4))
  return `${shortDate(r.start, sy !== ey && sy !== thisYear)} – ${shortDate(r.end, ey !== thisYear)}`
}
