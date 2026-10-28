import { useRef, useState, type PointerEvent } from 'react'
import { ChartColumn, Ellipsis, History, House, Plus } from 'lucide-react'

export type Tab = 'home' | 'history' | 'stats' | 'more'

const ITEMS: { key: Tab; label: string; Icon: typeof House }[] = [
  { key: 'home', label: 'Pregled', Icon: House },
  { key: 'history', label: 'Istorija', Icon: History },
  { key: 'stats', label: 'Statistika', Icon: ChartColumn },
  { key: 'more', label: 'Još', Icon: Ellipsis },
]

const N = ITEMS.length

/** The lens under a finger: px in from the row's sides, and the tab it's over. */
type Lens = { left: number; right: number; over: number }

/**
 * Floating Liquid Glass tab bar (iOS 26). The selection lens slides between tabs
 * leading edge first, so it stretches like liquid; under a finger it swells, follows
 * a drag across the tabs and lands on the one it's released over. Tapping the open
 * tab scrolls back to the top. + floats beside it as tinted glass.
 */
export default function TabBar({
  tab,
  onTab,
  onAdd,
}: {
  tab: Tab
  onTab: (t: Tab) => void
  onAdd: () => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const active = ITEMS.findIndex((i) => i.key === tab)
  // which way the lens last travelled — its leading edge moves first
  const [shown, setShown] = useState(active)
  const [dir, setDir] = useState(1)
  if (shown !== active) {
    setDir(active > shown ? 1 : -1)
    setShown(active)
  }
  const [lens, setLens] = useState<Lens | null>(null)
  const down = useRef<{ x: number; dragging: boolean } | null>(null)
  // pointer taps are handled on release; swallow the click that follows
  const handled = useRef(false)

  const lensAt = (clientX: number): Lens => {
    const r = rowRef.current!.getBoundingClientRect()
    const w = r.width / N
    const left = Math.min(Math.max(clientX - r.left - w / 2, 0), r.width - w)
    return { left, right: r.width - w - left, over: Math.round(left / w) }
  }

  const select = (key: Tab) => {
    if (key === tab) window.scrollTo({ top: 0, behavior: 'smooth' })
    else onTab(key)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    // follow the press even when it strays off the bar, so the release always lands here
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // pointer already gone — nothing to follow
    }
    down.current = { x: e.clientX, dragging: false }
    handled.current = false
    setLens(lensAt(e.clientX))
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = down.current
    if (!d) return
    if (Math.abs(e.clientX - d.x) > 6) d.dragging = true
    if (d.dragging) setLens(lensAt(e.clientX))
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!down.current) return
    handled.current = true
    select(ITEMS[lensAt(e.clientX).over].key)
    release()
  }

  const release = () => {
    down.current = null
    setLens(null)
  }

  const pressed = lens != null
  const lead = '0.32s var(--spring)'
  const lag = '0.46s 0.05s var(--spring)'
  const lensStyle = {
    ...(lens
      ? { left: lens.left, right: lens.right }
      : { left: `${(active / N) * 100}%`, right: `${((N - 1 - active) / N) * 100}%` }),
    transition: [
      pressed
        ? 'left 0.22s var(--ease-glide), right 0.22s var(--ease-glide)'
        : dir > 0
          ? `right ${lead}, left ${lag}`
          : `left ${lead}, right ${lag}`,
      'transform 0.45s var(--spring)',
      'background-color 0.25s ease',
      'box-shadow 0.25s ease',
    ].join(', '),
  }

  return (
    <>
      {/* content dissolves into the bottom edge instead of colliding with the glass */}
      <div aria-hidden className="scroll-edge pointer-events-none fixed inset-x-0 bottom-0 z-30" />
      <div
        className="fixed inset-x-0 z-40"
        style={{ bottom: 'max(calc(env(safe-area-inset-bottom) - 8px), 12px)' }}
      >
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4">
          <nav className="lg h-[62px] flex-1 select-none rounded-full p-1" aria-label="Navigacija">
            <div
              ref={rowRef}
              className="relative flex h-full touch-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={release}
              onLostPointerCapture={release}
              onClickCapture={(e) => {
                // keyboard clicks (detail 0) always go through
                if (handled.current && e.detail !== 0) e.stopPropagation()
                handled.current = false
              }}
            >
              <span
                aria-hidden
                className={`lg-lens absolute inset-y-0 rounded-full ${pressed ? 'lg-lens-up' : ''}`}
                style={lensStyle}
              />
              {ITEMS.map(({ key, label, Icon }, i) => {
                const on = i === active
                return (
                  <button
                    key={key}
                    onClick={() => select(key)}
                    className="relative flex h-full flex-1 flex-col items-center justify-center gap-[3px] rounded-full"
                    style={{
                      color: on ? 'var(--accent)' : 'var(--ink)',
                      // the lens magnifies what's under it
                      transform: lens?.over === i ? 'scale(1.12)' : undefined,
                      transition: 'transform 0.4s var(--spring), color 0.25s ease',
                    }}
                    aria-current={on ? 'page' : undefined}
                  >
                    <Icon size={24} strokeWidth={on ? 2.3 : 1.9} />
                    <span className="text-[10.5px] font-semibold leading-none">{label}</span>
                  </button>
                )
              })}
            </div>
          </nav>
          <button
            onClick={onAdd}
            aria-label="Dodaj trošak"
            className="lg lg-tint lg-swell flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full"
          >
            <Plus size={28} strokeWidth={2.6} />
          </button>
        </div>
      </div>
    </>
  )
}
