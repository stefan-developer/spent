import { useMemo, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, Search } from 'lucide-react'
import CategoryIcon from '../components/CategoryIcon'
import { catColor, db, type Expense } from '../db'
import { dayLabel, fmtDin, type Month } from '../lib/format'
import { periodRange, periodTitle, usePeriodCfg } from '../lib/period'
import { expensesIn, groupByDay, totalOf } from '../lib/queries'
import ExpenseRow from '../components/ExpenseRow'
import MonthSwitcher from '../components/MonthSwitcher'

function Chip({
  active,
  tint,
  onClick,
  children,
}: {
  active: boolean
  tint?: string
  onClick: () => void
  children: ReactNode
}) {
  const color = tint ?? 'var(--accent)'
  return (
    <button
      onClick={onClick}
      className="press shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-medium"
      style={
        active
          ? {
              background: `color-mix(in srgb, ${color} 18%, transparent)`,
              boxShadow: `inset 0 0 0 1.5px ${color}`,
            }
          : {
              background: 'color-mix(in srgb, var(--ink) 6%, transparent)',
              color: 'var(--ink-2)',
            }
      }
    >
      {children}
    </button>
  )
}

export default function History({
  month,
  onMonth,
  onEdit,
}: {
  month: Month
  onMonth: (m: Month) => void
  onEdit: (e: Expense) => void
}) {
  const cfg = usePeriodCfg()
  const range = periodRange(month, cfg)
  const categories = useLiveQuery(() => db.categories.orderBy('order').toArray(), []) ?? []
  const expenses = useLiveQuery(() => expensesIn(range), [range.start, range.end])
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState<number | null>(null)
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  const loaded = expenses !== undefined
  const list = expenses ?? []
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return list.filter((e) => {
      if (catFilter != null && e.categoryId !== catFilter) return false
      if (tagFilter != null && (e.tag?.toLowerCase() ?? '') !== tagFilter.toLowerCase()) return false
      if (!needle) return true
      const c = catById.get(e.categoryId)
      return (
        (e.note?.toLowerCase().includes(needle) ?? false) ||
        (e.tag?.toLowerCase().includes(needle) ?? false) ||
        (c?.name.toLowerCase().includes(needle) ?? false)
      )
    })
  }, [list, q, catFilter, tagFilter, catById])

  // oznake prisutne u ovom mesecu, najčešće prve
  const monthTags = useMemo(() => {
    const stats = new Map<string, { display: string; count: number }>()
    for (const e of list) {
      if (!e.tag) continue
      const key = e.tag.toLowerCase()
      const s = stats.get(key)
      if (s) s.count++
      else stats.set(key, { display: e.tag, count: 1 })
    }
    return [...stats.values()].sort((a, b) => b.count - a.count).slice(0, 10)
  }, [list])

  const groups = groupByDay(filtered)
  const total = totalOf(filtered)

  return (
    <div className="animate-fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight">Istorija</h1>
          <div className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
            {periodTitle(month, cfg)} · {fmtDin(total)}
          </div>
        </div>
        <MonthSwitcher month={month} onMonth={onMonth} />
      </header>

      <div
        className="mt-4 flex items-center gap-2 rounded-full px-4 py-2.5"
        style={{ background: 'color-mix(in srgb, var(--ink) 6%, transparent)' }}
      >
        <Search size={16} style={{ color: 'var(--ink-3)' }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pretraži beleške i kategorije"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
        <Chip active={catFilter == null} onClick={() => setCatFilter(null)}>
          Sve
        </Chip>
        {categories.map((c) => (
          <Chip
            key={c.id}
            active={catFilter === c.id}
            tint={catColor(c.color)}
            onClick={() => setCatFilter(catFilter === c.id ? null : c.id)}
          >
            <span className="flex items-center gap-1.5">
              <CategoryIcon icon={c.icon} size={14} color={catColor(c.color)} />
              {c.name}
            </span>
          </Chip>
        ))}
      </div>

      {monthTags.length > 0 && (
        <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5">
          {monthTags.map(({ display }) => (
            <Chip
              key={display.toLowerCase()}
              active={tagFilter?.toLowerCase() === display.toLowerCase()}
              onClick={() =>
                setTagFilter(tagFilter?.toLowerCase() === display.toLowerCase() ? null : display)
              }
            >
              #{display}
            </Chip>
          ))}
        </div>
      )}

      {loaded && list.length === 0 && (
        <section className="card mt-4 flex flex-col items-center px-5 py-12 text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}
          >
            <CalendarDays size={26} style={{ color: 'var(--accent)' }} />
          </span>
          <p className="mt-3 text-sm font-medium">
            Nema troškova u ovom {cfg.salary ? 'periodu' : 'mesecu'}
          </p>
        </section>
      )}

      {list.length > 0 && filtered.length === 0 && (
        <section className="card mt-4 flex flex-col items-center px-5 py-10 text-center">
          <p className="text-sm font-medium">Ništa nije pronađeno</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--ink-3)' }}>
            Probaj drugu pretragu ili filter
          </p>
        </section>
      )}

      {groups.map(([day, items]) => (
        <div key={day} className="mt-4">
          <div className="flex items-baseline justify-between px-1">
            <span className="text-sm font-semibold">{dayLabel(day)}</span>
            <span className="tnum text-xs" style={{ color: 'var(--ink-3)' }}>
              {fmtDin(totalOf(items))}
            </span>
          </div>
          <div className="card mt-1.5 px-4 py-1">
            {items.map((e, i) => (
              <div key={e.id} className={i > 0 ? 'hairline-t' : ''}>
                <ExpenseRow expense={e} category={catById.get(e.categoryId)} onClick={() => onEdit(e)} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
