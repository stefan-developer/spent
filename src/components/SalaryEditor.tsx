import { useEffect, useState } from 'react'
import { MONTHS_GEN } from '../lib/format'
import { currentPeriod, periodRange, rangeLabel, salaryAdj, salaryName } from '../lib/period'
import { getSettings, updateSettings, useSettings } from '../lib/settings'
import FullPage from './FullPage'

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

/** Payday setup: just the day; which month's salary that is gets pre-picked from it. */
export default function SalaryEditor({
  open,
  onClose,
  onDone,
}: {
  open: boolean
  onClose: () => void
  onDone: (msg: string) => void
}) {
  const settings = useSettings()
  const [day, setDay] = useState<number | null>(null)
  const [forPrev, setForPrev] = useState(true)
  const [nameTouched, setNameTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    const s = getSettings().salary
    setDay(s?.day ?? null)
    setForPrev(s?.forPrevMonth ?? true)
    setNameTouched(s != null)
  }, [open])

  const pickDay = (d: number) => {
    setDay(d)
    // early paydays usually pay out the previous month, late ones the month itself
    if (!nameTouched) setForPrev(d <= 15)
  }

  const save = () => {
    if (day == null) return
    const first = getSettings().salary == null
    updateSettings({ salary: { day, forPrevMonth: forPrev }, ...(first && { view: 'salary' }) })
    onDone(first ? 'Plata podešena' : 'Sačuvano')
    onClose()
  }

  const remove = () => {
    updateSettings({ salary: undefined, view: undefined })
    onDone('Vraćeno na kalendarske mesece')
    onClose()
  }

  // the naming question uses this month: "Plata koja stigne 10. oktobra je"
  const now = new Date()
  const m = now.getMonth()
  const monthLen = new Date(now.getFullYear(), m + 1, 0).getDate()
  const cfg = day != null ? { salary: true, day, lag: forPrev ? 1 : 0 } : null
  const cur = cfg && currentPeriod(cfg)

  return (
    <FullPage
      open={open}
      title="Od plate do plate"
      onClose={onClose}
      onSave={save}
      saveDisabled={day == null}
    >
      <p className="mt-3 text-sm" style={{ color: 'var(--ink-2)' }}>
        Mesec počinje danom plate umesto 1. Unosi ostaju isti, menja se samo kako se grupišu — a na
        Pregledu prebacuješ između meseca i plate.
      </p>

      <section className="card mt-4 p-4">
        <h2 className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
          Plata stiže
        </h2>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {DAYS.map((d) => {
            const selected = d === day
            return (
              <button
                key={d}
                onClick={() => pickDay(d)}
                aria-label={`${d}. u mesecu`}
                aria-pressed={selected}
                className="press tnum flex h-10 items-center justify-center rounded-xl text-sm font-semibold"
                style={
                  selected
                    ? { background: 'var(--accent)', color: 'var(--on-accent)' }
                    : {
                        background: 'color-mix(in srgb, var(--ink) 5%, transparent)',
                        color: 'var(--ink-2)',
                      }
                }
              >
                {d}
              </button>
            )
          })}
        </div>
        {day != null && day > 28 && (
          <p className="mt-3 text-xs" style={{ color: 'var(--ink-3)' }}>
            U kraćim mesecima računa se poslednji dan.
          </p>
        )}
      </section>

      {/* preview; the name is a detail you only touch when it's wrong for your employer */}
      {day != null && cfg && cur && (
        <section className="card mt-3 p-4">
          <div className="text-xs font-medium" style={{ color: 'var(--ink-3)' }}>
            Sada traje
          </div>
          <div className="mt-1 text-lg font-semibold">{salaryName(cur)}</div>
          <div className="mt-0.5 text-sm" style={{ color: 'var(--ink-2)' }}>
            {rangeLabel(periodRange(cur, cfg))}
          </div>
          <div className="hairline-t mt-3.5 pt-3.5">
            <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
              Plata koja stigne {Math.min(day, monthLen)}. {MONTHS_GEN[m]} je:
            </div>
            <div
              className="mt-2 inline-flex rounded-full p-0.5"
              style={{ background: 'color-mix(in srgb, var(--ink) 7%, transparent)' }}
            >
              {[true, false].map((prev) => (
                <button
                  key={String(prev)}
                  onClick={() => {
                    setForPrev(prev)
                    setNameTouched(true)
                  }}
                  className="press rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={
                    forPrev === prev
                      ? { background: 'color-mix(in srgb, var(--ink) 14%, transparent)' }
                      : { color: 'var(--ink-3)' }
                  }
                >
                  {salaryAdj(prev ? (m + 11) % 12 : m).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {settings.salary && (
        <button
          onClick={remove}
          className="press mt-5 w-full rounded-full py-3 text-sm font-semibold"
          style={{ color: 'var(--danger)' }}
        >
          Isključi — samo kalendarski meseci
        </button>
      )}
    </FullPage>
  )
}
