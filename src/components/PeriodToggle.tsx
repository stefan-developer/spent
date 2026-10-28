import { updateSettings, useSettings } from '../lib/settings'

const OPTIONS = [
  { key: 'month', label: 'Mesec' },
  { key: 'salary', label: 'Plata' },
] as const

/** Mesec ↔ Plata: which window the app looks through. Shown once a payday is set. */
export default function PeriodToggle() {
  const { view } = useSettings()
  const active = view === 'salary' ? 'salary' : 'month'
  return (
    <div
      className="flex rounded-full p-1"
      style={{ background: 'color-mix(in srgb, var(--ink) 7%, transparent)' }}
      role="radiogroup"
      aria-label="Prikaz"
    >
      {OPTIONS.map(({ key, label }) => {
        const on = key === active
        return (
          <button
            key={key}
            role="radio"
            aria-checked={on}
            onClick={() => updateSettings({ view: key })}
            className="press rounded-full px-4 py-1.5 text-[13px] font-semibold"
            style={
              on
                ? {
                    background: 'color-mix(in srgb, var(--ink) 13%, transparent)',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                  }
                : { color: 'var(--ink-3)' }
            }
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
