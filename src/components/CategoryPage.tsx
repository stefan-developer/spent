import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Leaf, TrendingDown, TrendingUp, TriangleAlert } from 'lucide-react'
import { catColor, type Category, type Expense } from '../db'
import { addMonths, fmtNum, type Month } from '../lib/format'
import { elapsedDays, periodPhrase, periodRange, prevPhrase, usePeriodCfg } from '../lib/period'
import { expensesIn, newestFirst, totalOf } from '../lib/queries'
import CategoryIcon from './CategoryIcon'
import ExpenseRow from './ExpenseRow'
import FullPage from './FullPage'
import Meter from './Meter'
import MonthSwitcher from './MonthSwitcher'

const entries = (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'unos' : 'unosa'}`

/** Drill-down from a category row: its expenses in a month, with total, change and limit. */
export default function CategoryPage({
  category,
  initialMonth,
  onClose,
  onEdit,
}: {
  category: Category
  initialMonth: Month
  onClose: () => void
  onEdit: (e: Expense) => void
}) {
  const [month, setMonth] = useState(initialMonth)
  const cfg = usePeriodCfg()
  const range = periodRange(month, cfg)
  const prevRange = periodRange(addMonths(month, -1), cfg)
  const expenses = useLiveQuery(() => expensesIn(range), [range.start, range.end])
  const prevExpenses =
    useLiveQuery(() => expensesIn(prevRange), [prevRange.start, prevRange.end]) ?? []

  const loaded = expenses !== undefined
  const monthList = expenses ?? []
  const list = monthList.filter((e) => e.categoryId === category.id).sort(newestFirst)
  const total = totalOf(list)
  const prevTotal = totalOf(prevExpenses.filter((e) => e.categoryId === category.id))
  const monthTotal = totalOf(monthList)
  const share = monthTotal > 0 ? (total / monthTotal) * 100 : 0

  const diff = total - prevTotal
  const showDelta = elapsedDays(range) > 0 && prevTotal > 0 && list.length > 0 && diff !== 0

  const budget = category.budget ?? 0
  const color = catColor(category.color)
  const phrase = periodPhrase(month, cfg)

  return (
    <FullPage
      open
      title={
        <span className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: `color-mix(in srgb, ${color} 16%, transparent)` }}
          >
            <CategoryIcon icon={category.icon} size={24} color={color} />
          </span>
          <span className="min-w-0 truncate">{category.name}</span>
        </span>
      }
      onClose={onClose}
      headerRight={<MonthSwitcher month={month} onMonth={setMonth} />}
    >
      {/* category total for the month */}
      <section className="card mt-4 p-5">
        <div className="text-[13px]" style={{ color: 'var(--ink-2)' }}>
          Potrošeno {phrase}
        </div>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-[48px] font-bold leading-none tracking-tight">{fmtNum(total)}</span>
          <span className="text-xl font-semibold" style={{ color: 'var(--ink-2)' }}>
            din
          </span>
        </div>
        {showDelta && (
          <div
            className="mt-3 flex items-center gap-1.5 text-[13px] font-medium"
            style={{ color: diff < 0 ? 'var(--good)' : 'var(--danger)' }}
          >
            {diff < 0 ? <TrendingDown size={15} /> : <TrendingUp size={15} />}
            {fmtNum(Math.abs(diff))} din {diff < 0 ? 'manje' : 'više'} nego {prevPhrase(month, cfg)}
          </div>
        )}
        {list.length > 0 && (
          <div className="mt-1 text-[13px]" style={{ color: 'var(--ink-2)' }}>
            {entries(list.length)} · {share < 1 ? '<1' : Math.round(share)}% ukupne potrošnje
          </div>
        )}
      </section>

      {/* category limit */}
      {budget > 0 && (
        <section className="card mt-3 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Mesečni limit</span>
            <span className="tnum" style={{ color: 'var(--ink-2)' }}>
              {fmtNum(total)} / {fmtNum(budget)} din
            </span>
          </div>
          <div className="mt-2">
            <Meter value={total} max={budget} hue={color} />
          </div>
          {total > budget && (
            <div
              className="mt-2 flex items-center gap-1.5 text-[13px] font-medium"
              style={{ color: 'var(--danger)' }}
            >
              <TriangleAlert size={14} />
              Preko limita za {fmtNum(total - budget)} din
            </div>
          )}
        </section>
      )}

      {/* nothing in this category this month */}
      {loaded && list.length === 0 && (
        <section className="card mt-3 flex flex-col items-center px-5 py-12 text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}
          >
            <Leaf size={26} style={{ color: 'var(--accent)' }} />
          </span>
          <p className="mt-3 text-sm font-medium">Nema troškova {phrase}</p>
        </section>
      )}

      {/* the expenses, newest first — tap to edit */}
      {list.length > 0 && (
        <section className="card mt-3 px-5 py-4">
          <h2 className="text-base font-semibold">Troškovi</h2>
          <div className="mt-1">
            {list.map((e, i) => (
              <div key={e.id} className={i > 0 ? 'hairline-t' : ''}>
                <ExpenseRow
                  expense={e}
                  category={category}
                  showDay
                  noteAsTitle
                  onClick={() => onEdit(e)}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </FullPage>
  )
}
