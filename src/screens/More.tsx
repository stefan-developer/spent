import { useRef, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Banknote,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Pencil,
  Plus,
  ShieldCheck,
  Upload,
  Wallet,
} from 'lucide-react'
import { catColor, db, type Category } from '../db'
import { fmtDin, fmtNum } from '../lib/format'
import { exportCSV, exportJSON, importJSON } from '../lib/backup'
import { updateSettings, useSettings } from '../lib/settings'
import CategoryEditor from '../components/CategoryEditor'
import CategoryIcon from '../components/CategoryIcon'
import Confirm from '../components/Confirm'
import FullPage from '../components/FullPage'
import SalaryEditor from '../components/SalaryEditor'

function IconChip({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
      style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
    >
      {children}
    </span>
  )
}

export default function More({ showToast }: { showToast: (m: string) => void }) {
  const settings = useSettings()
  const categories = useLiveQuery(() => db.categories.orderBy('order').toArray(), []) ?? []
  const expCount = useLiveQuery(() => db.expenses.count(), []) ?? 0

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | undefined>()
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [budgetStr, setBudgetStr] = useState('')
  const [salaryOpen, setSalaryOpen] = useState(false)
  const [pendingImport, setPendingImport] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const openCat = (c?: Category) => {
    setEditingCat(c)
    setEditorOpen(true)
  }

  const openBudget = () => {
    setBudgetStr(settings.monthlyBudget ? String(settings.monthlyBudget) : '')
    setBudgetOpen(true)
  }

  const saveBudget = () => {
    const n = parseInt(budgetStr || '0', 10)
    updateSettings({ monthlyBudget: n > 0 ? n : undefined })
    showToast(n > 0 ? 'Budžet sačuvan' : 'Budžet uklonjen')
    setBudgetOpen(false)
  }

  const cancelImport = () => {
    setPendingImport(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const doImport = async () => {
    if (!pendingImport) return
    try {
      const res = await importJSON(pendingImport)
      showToast(`Uvezeno: ${res.expenses} troškova`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Uvoz nije uspeo')
    }
    cancelImport()
  }

  return (
    <div className="animate-fade-in">
      <header>
        <h1 className="text-[28px] font-bold leading-tight">Još</h1>
        <div className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
          Kategorije, budžet i podaci
        </div>
      </header>

      {/* categories */}
      <section className="card mt-4 px-5 py-4">
        <h2 className="text-base font-semibold">Kategorije</h2>
        <div className="mt-1">
          {categories.map((c, i) => (
            <button
              key={c.id}
              onClick={() => openCat(c)}
              className={`press flex w-full items-center gap-3 py-2.5 text-left ${i > 0 ? 'hairline-t' : ''}`}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `color-mix(in srgb, ${catColor(c.color)} 16%, transparent)` }}
              >
                <CategoryIcon icon={c.icon} size={22} color={catColor(c.color)} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{c.name}</span>
                {c.budget != null && c.budget > 0 && (
                  <span className="block text-xs" style={{ color: 'var(--ink-3)' }}>
                    Limit {fmtDin(c.budget)}
                  </span>
                )}
              </span>
              <Pencil size={15} style={{ color: 'var(--ink-3)' }} />
            </button>
          ))}
        </div>
        <button
          onClick={() => openCat(undefined)}
          className="press mt-2 flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold"
          style={{
            background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
            color: 'var(--accent)',
          }}
        >
          <Plus size={16} /> Nova kategorija
        </button>
      </section>

      {/* budget */}
      <section className="card mt-3 px-5 py-2">
        <button onClick={openBudget} className="press flex w-full items-center gap-3 py-3 text-left">
          <IconChip color="var(--accent)">
            <Wallet size={17} />
          </IconChip>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Mesečni budžet</span>
            <span className="block text-xs" style={{ color: 'var(--ink-3)' }}>
              {settings.monthlyBudget ? fmtDin(settings.monthlyBudget) : 'Nije podešen'}
            </span>
          </span>
          <ChevronRight size={16} style={{ color: 'var(--ink-3)' }} />
        </button>
        <button
          onClick={() => setSalaryOpen(true)}
          className="press hairline-t flex w-full items-center gap-3 py-3 text-left"
        >
          <IconChip color="var(--cat-yellow)">
            <Banknote size={17} />
          </IconChip>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Od plate do plate</span>
            <span className="block text-xs" style={{ color: 'var(--ink-3)' }}>
              {settings.salary ? `Plata stiže ${settings.salary.day}. u mesecu` : 'Nije podešeno'}
            </span>
          </span>
          <ChevronRight size={16} style={{ color: 'var(--ink-3)' }} />
        </button>
      </section>

      {/* data */}
      <section className="card mt-3 px-5 py-2">
        <button
          onClick={() => void exportJSON().then(() => showToast('Backup sačuvan'))}
          className="press flex w-full items-center gap-3 py-3 text-left"
        >
          <IconChip color="var(--accent)">
            <Download size={17} />
          </IconChip>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Sačuvaj backup (JSON)</span>
            <span className="block text-xs" style={{ color: 'var(--ink-3)' }}>
              Kompletna kopija svih podataka
            </span>
          </span>
        </button>
        <button
          onClick={() => void exportCSV().then(() => showToast('CSV sačuvan'))}
          className="press hairline-t flex w-full items-center gap-3 py-3 text-left"
        >
          <IconChip color="var(--cat-aqua)">
            <FileSpreadsheet size={17} />
          </IconChip>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Izvezi CSV</span>
            <span className="block text-xs" style={{ color: 'var(--ink-3)' }}>
              Za Excel ili Google Sheets
            </span>
          </span>
        </button>
        <label className="press hairline-t flex w-full cursor-pointer items-center gap-3 py-3 text-left">
          <IconChip color="var(--cat-blue)">
            <Upload size={17} />
          </IconChip>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Uvezi backup</span>
            <span className="block text-xs" style={{ color: 'var(--ink-3)' }}>
              Zamenjuje postojeće podatke
            </span>
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) setPendingImport(f)
            }}
          />
        </label>
        <div className="hairline-t pb-2 pt-3 text-xs" style={{ color: 'var(--ink-3)' }}>
          {fmtNum(expCount)} unosa · {categories.length} kategorija
        </div>
      </section>

      {/* about */}
      <section className="card mt-3 flex items-start gap-3 p-5">
        <IconChip color="var(--accent)">
          <ShieldCheck size={17} />
        </IconChip>
        <div>
          <div className="text-sm font-medium">Spent v0.1</div>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            Svi podaci ostaju u tvom telefonu — nema servera, naloga ni praćenja. Povremeno sačuvaj
            backup za svaki slučaj.
          </p>
        </div>
      </section>

      {/* monthly budget page */}
      <FullPage
        open={budgetOpen}
        title="Mesečni budžet"
        onClose={() => setBudgetOpen(false)}
        onSave={saveBudget}
      >
        <p className="mt-3 text-sm" style={{ color: 'var(--ink-2)' }}>
          Ukupan limit za mesec — napredak se prikazuje na Pregledu.
        </p>
        <div className="card relative mt-4 p-4">
          <input
            value={budgetStr}
            onChange={(e) => setBudgetStr(e.target.value.replace(/\D/g, '').slice(0, 9))}
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="npr. 60000"
            enterKeyHint="done"
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="w-full rounded-2xl px-4 py-3 pr-12 text-lg font-semibold outline-none"
            style={{ background: 'color-mix(in srgb, var(--ink) 5%, transparent)' }}
          />
          <span
            className="absolute right-8 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: 'var(--ink-3)' }}
          >
            din
          </span>
        </div>
        {settings.monthlyBudget != null && (
          <button
            onClick={() => {
              updateSettings({ monthlyBudget: undefined })
              showToast('Budžet uklonjen')
              setBudgetOpen(false)
            }}
            className="press mt-4 w-full rounded-full py-3 text-sm font-semibold"
            style={{ color: 'var(--danger)' }}
          >
            Ukloni budžet
          </button>
        )}
      </FullPage>

      <Confirm
        open={pendingImport != null}
        title="Uvesti backup?"
        message="Svi postojeći podaci biće zamenjeni sadržajem fajla."
        confirmLabel="Uvezi"
        danger
        onConfirm={() => void doImport()}
        onCancel={cancelImport}
      />

      <SalaryEditor open={salaryOpen} onClose={() => setSalaryOpen(false)} onDone={showToast} />

      <CategoryEditor
        open={editorOpen}
        category={editingCat}
        onClose={() => setEditorOpen(false)}
        onDone={showToast}
      />
    </div>
  )
}
