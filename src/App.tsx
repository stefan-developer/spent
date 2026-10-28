import { useEffect, useRef, useState } from 'react'
import type { Category, Expense } from './db'
import { todayStr, type Month } from './lib/format'
import { currentPeriod, defaultDateFor, remapPeriod, sameCfg, usePeriodCfg } from './lib/period'
import TabBar, { type Tab } from './components/TabBar'
import Toast from './components/Toast'
import EntryPage from './components/EntryPage'
import CategoryPage from './components/CategoryPage'
import Home from './screens/Home'
import History from './screens/History'
import Stats from './screens/Stats'
import More from './screens/More'

export default function App() {
  const cfg = usePeriodCfg()
  const [tab, setTab] = useState<Tab>('home')
  const [month, setMonth] = useState<Month>(() => currentPeriod(cfg))
  // Mesec ↔ Plata (or a new payday) keeps the same stretch of time on screen
  const [shownCfg, setShownCfg] = useState(cfg)
  if (!sameCfg(shownCfg, cfg)) {
    setShownCfg(cfg)
    setMonth(remapPeriod(month, shownCfg, cfg))
  }
  const [entryOpen, setEntryOpen] = useState(false)
  const [entryDate, setEntryDate] = useState(todayStr)
  const [editing, setEditing] = useState<Expense | undefined>()
  const [catView, setCatView] = useState<{ category: Category; month: Month } | null>(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    // request persistent storage so the browser doesn't evict IndexedDB
    void navigator.storage?.persist?.()
  }, [])

  useEffect(() => {
    // iOS standalone (PWA) can lay out with a short viewport on launch,
    // leaving fixed elements floating too high — nudge it until it settles
    const nudge = () => {
      window.scrollTo(0, 1)
      window.scrollTo(0, 0)
    }
    requestAnimationFrame(nudge)
    const iv = window.setInterval(nudge, 300)
    const stop = window.setTimeout(() => window.clearInterval(iv), 1800)
    window.addEventListener('pageshow', nudge)
    window.addEventListener('resize', nudge)
    return () => {
      window.clearInterval(iv)
      window.clearTimeout(stop)
      window.removeEventListener('pageshow', nudge)
      window.removeEventListener('resize', nudge)
    }
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2400)
  }

  const openNew = () => {
    // from Pregled / Istorija a new entry lands in the period on screen
    setEntryDate(tab === 'home' || tab === 'history' ? defaultDateFor(month, cfg) : todayStr())
    setEditing(undefined)
    setEntryOpen(true)
  }

  const openEdit = (e: Expense) => {
    setEditing(e)
    setEntryOpen(true)
  }

  const openCategory = (category: Category, m: Month) => setCatView({ category, month: m })

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md px-5 pb-[calc(env(safe-area-inset-bottom)+112px)] pt-[calc(env(safe-area-inset-top)+20px)]">
      {tab === 'home' && (
        <Home
          month={month}
          onMonth={setMonth}
          onEdit={openEdit}
          onSeeAll={() => setTab('history')}
          onCategory={openCategory}
        />
      )}
      {tab === 'history' && <History month={month} onMonth={setMonth} onEdit={openEdit} />}
      {tab === 'stats' && <Stats onCategory={openCategory} />}
      {tab === 'more' && <More showToast={showToast} />}

      <TabBar tab={tab} onTab={setTab} onAdd={openNew} />
      {/* before EntryPage, so editing an expense from here opens on top */}
      {catView && (
        <CategoryPage
          category={catView.category}
          initialMonth={catView.month}
          onClose={() => setCatView(null)}
          onEdit={openEdit}
        />
      )}
      <EntryPage
        open={entryOpen}
        editing={editing}
        defaultDate={entryDate}
        onClose={() => setEntryOpen(false)}
        onDone={showToast}
      />
      <Toast message={toast} />
    </div>
  )
}
