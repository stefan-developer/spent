import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Leaf, TrendingDown, TrendingUp, TriangleAlert } from 'lucide-react'
import CategoryIcon from '../components/CategoryIcon'
import { catColor, db, type Category, type Expense } from '../db'
import { addMonths, fmtDin, fmtNum, type Month } from '../lib/format'
import {
  daysLeft,
  elapsedDays,
  periodName,
  periodPhrase,
  periodRange,
  prevPhrase,
  rangeLabel,
  usePeriodCfg,
  yearSuffix,
} from '../lib/period'
import { expensesIn, newestFirst, sumByCategory, totalOf } from '../lib/queries'
import { useSettings } from '../lib/settings'
import CatBarRow from '../components/CatBarRow'
import ExpenseRow from '../components/ExpenseRow'
import Meter from '../components/Meter'
import MonthSwitcher from '../components/MonthSwitcher'
import PeriodToggle from '../components/PeriodToggle'

const paydayIn = (n: number) =>
  n === 1
    ? 'plata stiže sutra'
    : `plata za ${n} ${n % 10 === 1 && n % 100 !== 11 ? 'dan' : 'dana'}`

export default function Home({
  month,
  onMonth,
  onEdit,
  onSeeAll,
  onCategory,
}: {
  month: Month
  onMonth: (m: Month) => void
  onEdit: (e: Expense) => void
  onSeeAll: () => void
  onCategory: (c: Category, m: Month) => void
}) {
  const settings = useSettings()
  const cfg = usePeriodCfg()
  const range = periodRange(month, cfg)
  const prevRange = periodRange(addMonths(month, -1), cfg)
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? []
  const expenses = useLiveQuery(() => expensesIn(range), [range.start, range.end])
  const prevExpenses =
    useLiveQuery(() => expensesIn(prevRange), [prevRange.start, prevRange.end]) ?? []

  const loaded = expenses !== undefined
  const list = expenses ?? []
  const total = totalOf(list)
  const prevTotal = totalOf(prevExpenses)
  const sums = sumByCategory(list, categories)
  const maxCat = sums[0]?.total ?? 0
  const catById = new Map(categories.map((c) => [c.id, c]))

  // 0 for a period still ahead — no average or comparison for entries made in advance
  const elapsed = elapsedDays(range)
  const avg = list.length > 0 && elapsed > 0 ? total / elapsed : 0
  const toPayday = cfg.salary ? daysLeft(range) : null

  const diff = total - prevTotal
  const showDelta = elapsed > 0 && prevTotal > 0 && list.length > 0 && diff !== 0

  const recent = [...list].sort(newestFirst).slice(0, 4)

  const budget = settings.monthlyBudget
  const spentBy = new Map(sums.map((s) => [s.category.id, s.total]))
  const catBudgets =
    list.length > 0
      ? categories
          .filter((c) => c.budget && c.budget > 0)
          .sort((a, b) => a.order - b.order)
          .map((c) => ({ c, spent: spentBy.get(c.id) ?? 0 }))
      : []

  // a smaller year keeps "Decembarska plata 2025." on one line
  const year = yearSuffix(month, cfg)
  const title = (
    <>
      {periodName(month, cfg)}
      {year && (
        <span className="text-xl font-semibold" style={{ color: 'var(--ink-3)' }}>
          {year}
        </span>
      )}
    </>
  )

  return (
    <div className="animate-fade-in">
      {settings.salary ? (
        // payday set: the Mesec / Plata switch takes the top row, the title gets the full width
        <header>
          <div className="flex items-center justify-between">
            <PeriodToggle />
            <MonthSwitcher month={month} onMonth={onMonth} />
          </div>
          <h1 className="mt-2.5 text-[28px] font-bold leading-tight">{title}</h1>
        </header>
      ) : (
        <header className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-medium" style={{ color: 'var(--ink-3)' }}>
              Spent
            </div>
            <h1 className="text-[28px] font-bold leading-tight">{title}</h1>
          </div>
          <MonthSwitcher month={month} onMonth={onMonth} />
        </header>
      )}

      {/* period total */}
      <section className="card mt-4 p-5">
        <div className="text-[13px]" style={{ color: 'var(--ink-2)' }}>
          {cfg.salary
            ? rangeLabel(range) + (toPayday != null ? ` · ${paydayIn(toPayday)}` : '')
            : `Potrošeno ${periodPhrase(month, cfg)}`}
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
        {avg > 0 && (
          <div className="mt-1 text-[13px]" style={{ color: 'var(--ink-2)' }}>
            Prosečno {fmtDin(avg)} dnevno
          </div>
        )}
      </section>

      {/* overall monthly budget */}
      {budget != null && budget > 0 && (
        <section className="card mt-3 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Mesečni budžet</span>
            <span className="tnum" style={{ color: 'var(--ink-2)' }}>
              {fmtNum(total)} / {fmtNum(budget)} din
            </span>
          </div>
          <div className="mt-2">
            <Meter value={total} max={budget} />
          </div>
          {total > budget && (
            <div
              className="mt-2 flex items-center gap-1.5 text-[13px] font-medium"
              style={{ color: 'var(--danger)' }}
            >
              <TriangleAlert size={14} />
              Preko budžeta za {fmtNum(total - budget)} din
            </div>
          )}
        </section>
      )}

      {/* empty month */}
      {loaded && list.length === 0 && (
        <section className="card mt-3 flex flex-col items-center px-5 py-12 text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}
          >
            <Leaf size={26} style={{ color: 'var(--accent)' }} />
          </span>
          <p className="mt-3 text-sm font-medium">
            Nema troškova u ovom {cfg.salary ? 'periodu' : 'mesecu'}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--ink-3)' }}>
            {elapsed === 0 ? 'Dodaj unapred pomoću + dugmeta' : 'Dodaj prvi pomoću + dugmeta'}
          </p>
        </section>
      )}

      {/* by category */}
      {sums.length > 0 && (
        <section className="card mt-3 p-5">
          <h2 className="text-base font-semibold">Po kategorijama</h2>
          <div className="mt-3.5 space-y-4">
            {sums.map((s) => (
              <CatBarRow
                key={s.category.id}
                category={s.category}
                total={s.total}
                max={maxCat}
                onClick={() => onCategory(s.category, month)}
              />
            ))}
          </div>
        </section>
      )}

      {/* per-category budgets */}
      {catBudgets.length > 0 && (
        <section className="card mt-3 p-5">
          <h2 className="text-base font-semibold">Budžeti po kategorijama</h2>
          <div className="mt-3.5 space-y-4">
            {catBudgets.map(({ c, spent }) => {
              const over = spent > (c.budget ?? 0)
              return (
                <button
                  key={c.id}
                  onClick={() => onCategory(c, month)}
                  className="press flex w-full items-center gap-2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2.5">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          background: `color-mix(in srgb, ${catColor(c.color)} 16%, transparent)`,
                        }}
                      >
                        <CategoryIcon icon={c.icon} size={20} color={catColor(c.color)} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                      {over && <TriangleAlert size={14} style={{ color: 'var(--danger)' }} />}
                      <span
                        className="tnum shrink-0 text-[13px] font-medium"
                        style={{ color: over ? 'var(--danger)' : 'var(--ink-2)' }}
                      >
                        {fmtNum(spent)} / {fmtNum(c.budget ?? 0)}
                      </span>
                    </span>
                    <span className="ml-[46px] mt-1.5 block">
                      <Meter value={spent} max={c.budget ?? 0} hue={catColor(c.color)} />
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0" style={{ color: 'var(--ink-3)' }} />
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* recent */}
      {recent.length > 0 && (
        <section className="card mt-3 px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Nedavno</h2>
            <button
              onClick={onSeeAll}
              className="press text-[13px] font-medium"
              style={{ color: 'var(--accent)' }}
            >
              Sve →
            </button>
          </div>
          <div className="mt-1">
            {recent.map((e, i) => (
              <div key={e.id} className={i > 0 ? 'hairline-t' : ''}>
                <ExpenseRow
                  expense={e}
                  category={catById.get(e.categoryId)}
                  showDay
                  onClick={() => onEdit(e)}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
