import { useSyncExternalStore } from 'react'

/** Payday, for salary-to-salary periods. */
export interface Salary {
  day: number // 1–31; short months use their last day
  forPrevMonth: boolean // the salary arriving in November is the October one
}

export interface Settings {
  monthlyBudget?: number
  salary?: Salary // once set, Pregled gets the Mesec / Plata switch
  view?: 'month' | 'salary'
}

const KEY = 'spent-settings'

let current: Settings = load()
const listeners = new Set<() => void>()

export function parseSalary(v: unknown): Salary | undefined {
  const s = v as Partial<Salary> | null | undefined
  if (!s || typeof s.day !== 'number' || !Number.isInteger(s.day) || s.day < 1 || s.day > 31) {
    return undefined
  }
  return { day: s.day, forPrevMonth: s.forPrevMonth === true }
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<Settings>
    const salary = parseSalary(parsed.salary)
    return {
      monthlyBudget:
        typeof parsed.monthlyBudget === 'number' && parsed.monthlyBudget > 0
          ? parsed.monthlyBudget
          : undefined,
      salary,
      view: salary && parsed.view === 'salary' ? 'salary' : undefined,
    }
  } catch {
    return {}
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // storage unavailable — the app keeps working, settings just aren't persisted
  }
}

export const getSettings = () => current

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch }
  persist()
  listeners.forEach((l) => l())
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
  )
}
