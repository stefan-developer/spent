import { db, type Category, type Expense, type ColorSlot, COLOR_SLOTS } from '../db'
import { getSettings, parseSalary, updateSettings, type Salary } from './settings'
import { todayStr } from './format'

interface BackupFile {
  app: 'spent'
  version: 1
  exportedAt: string
  monthlyBudget?: number
  salary?: Salary
  categories: Category[]
  expenses: Expense[]
}

function download(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function exportJSON() {
  const [categories, expenses] = await Promise.all([
    db.categories.toArray(),
    db.expenses.toArray(),
  ])
  const payload: BackupFile = {
    app: 'spent',
    version: 1,
    exportedAt: new Date().toISOString(),
    monthlyBudget: getSettings().monthlyBudget,
    salary: getSettings().salary,
    categories,
    expenses,
  }
  download(JSON.stringify(payload, null, 2), 'application/json', `spent-backup-${todayStr()}.json`)
}

const csvEscape = (v: string) => (/[";\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v)

export async function exportCSV() {
  const [categories, expenses] = await Promise.all([
    db.categories.toArray(),
    db.expenses.orderBy('date').toArray(),
  ])
  const catName = new Map(categories.map((c) => [c.id, c.name]))
  const rows = ['Datum;Iznos;Kategorija;Oznaka;Beleška']
  for (const e of expenses) {
    rows.push(
      [
        e.date,
        String(e.amount),
        csvEscape(catName.get(e.categoryId) ?? ''),
        csvEscape(e.tag ?? ''),
        csvEscape(e.note ?? ''),
      ].join(';'),
    )
  }
  // BOM so Excel detects UTF-8 (š, č, ž...)
  download('﻿' + rows.join('\n'), 'text/csv;charset=utf-8', `spent-expenses-${todayStr()}.csv`)
}

const isSlot = (v: unknown): v is ColorSlot => COLOR_SLOTS.includes(v as ColorSlot)

/** Replace all local data with the backup file's contents. Returns imported counts. */
export async function importJSON(file: File): Promise<{ categories: number; expenses: number }> {
  const text = await file.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Fajl nije ispravan JSON.')
  }
  const b = data as Partial<BackupFile>
  if (b.app !== 'spent' || !Array.isArray(b.categories) || !Array.isArray(b.expenses)) {
    throw new Error('Ovo ne liči na Spent backup fajl.')
  }

  const categories: Category[] = b.categories
    .filter((c) => c && typeof c.id === 'number' && typeof c.name === 'string')
    .map((c, i) => ({
      id: c.id,
      name: c.name,
      icon: typeof c.icon === 'string' ? c.icon : '📦',
      color: isSlot(c.color) ? c.color : 'gray',
      budget: typeof c.budget === 'number' && c.budget > 0 ? c.budget : undefined,
      order: typeof c.order === 'number' ? c.order : i,
    }))
  const catIds = new Set(categories.map((c) => c.id))

  const expenses: Expense[] = b.expenses
    .filter(
      (e) =>
        e &&
        typeof e.id === 'number' &&
        typeof e.amount === 'number' &&
        e.amount > 0 &&
        typeof e.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
        typeof e.categoryId === 'number' &&
        catIds.has(e.categoryId),
    )
    .map((e) => ({
      id: e.id,
      amount: Math.round(e.amount),
      categoryId: e.categoryId,
      date: e.date,
      tag: typeof e.tag === 'string' && e.tag.trim() ? e.tag.trim().slice(0, 24) : undefined,
      note: typeof e.note === 'string' && e.note.trim() ? e.note.trim() : undefined,
      createdAt: typeof e.createdAt === 'number' ? e.createdAt : Date.now(),
    }))

  if (categories.length === 0) throw new Error('Backup ne sadrži nijednu kategoriju.')

  await db.transaction('rw', db.categories, db.expenses, async () => {
    await db.categories.clear()
    await db.expenses.clear()
    await db.categories.bulkAdd(categories)
    await db.expenses.bulkAdd(expenses)
  })
  if (typeof b.monthlyBudget === 'number' && b.monthlyBudget > 0) {
    updateSettings({ monthlyBudget: Math.round(b.monthlyBudget) })
  }
  const salary = parseSalary(b.salary)
  if (salary) updateSettings({ salary })
  return { categories: categories.length, expenses: expenses.length }
}
