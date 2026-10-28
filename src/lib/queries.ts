import { db, type Category, type Expense } from '../db'
import type { Range } from './period'

export const expensesIn = ({ start, end }: Range) =>
  db.expenses.where('date').between(start, end, true, true).toArray()

export interface CatSum {
  category: Category
  total: number
  count: number
}

export function sumByCategory(expenses: Expense[], categories: Category[]): CatSum[] {
  const byId = new Map<number, CatSum>()
  for (const c of categories) byId.set(c.id, { category: c, total: 0, count: 0 })
  for (const e of expenses) {
    const s = byId.get(e.categoryId)
    if (s) {
      s.total += e.amount
      s.count++
    }
  }
  return [...byId.values()].filter((s) => s.count > 0).sort((a, b) => b.total - a.total)
}

export const totalOf = (expenses: Expense[]) => expenses.reduce((s, e) => s + e.amount, 0)

/** Sort comparator: newest day first; within a day newest entry first. */
export const newestFirst = (a: Expense, b: Expense) =>
  a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1

/** Grouped by day, newest day first; within a day newest entry first. */
export function groupByDay(expenses: Expense[]): [string, Expense[]][] {
  const map = new Map<string, Expense[]>()
  const sorted = [...expenses].sort(newestFirst)
  for (const e of sorted) {
    let arr = map.get(e.date)
    if (!arr) {
      arr = []
      map.set(e.date, arr)
    }
    arr.push(e)
  }
  return [...map.entries()]
}
