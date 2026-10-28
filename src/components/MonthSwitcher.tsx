import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { db } from '../db'
import { addMonths, monthIdx, type Month } from '../lib/format'
import { currentPeriod, periodOf, usePeriodCfg } from '../lib/period'

export default function MonthSwitcher({
  month,
  onMonth,
}: {
  month: Month
  onMonth: (m: Month) => void
}) {
  const cfg = usePeriodCfg()
  // forward: always one period past now (to enter ahead), further only where entries exist
  const lastDate = useLiveQuery(async () => (await db.expenses.orderBy('date').last())?.date, [])
  const ahead = monthIdx(addMonths(currentPeriod(cfg), 1))
  const furthest = lastDate ? Math.max(ahead, monthIdx(periodOf(lastDate, cfg))) : ahead
  const atEnd = monthIdx(month) >= furthest
  const bg = { background: 'color-mix(in srgb, var(--ink) 7%, transparent)' }
  return (
    <div className="flex items-center gap-2">
      <button
        className="press flex h-11 w-11 items-center justify-center rounded-full"
        style={bg}
        onClick={() => onMonth(addMonths(month, -1))}
        aria-label="Prethodni mesec"
      >
        <ChevronLeft size={22} strokeWidth={2.5} />
      </button>
      <button
        className="press flex h-11 w-11 items-center justify-center rounded-full"
        style={{ ...bg, opacity: atEnd ? 0.35 : 1 }}
        disabled={atEnd}
        onClick={() => onMonth(addMonths(month, 1))}
        aria-label="Sledeći mesec"
      >
        <ChevronRight size={22} strokeWidth={2.5} />
      </button>
    </div>
  )
}
