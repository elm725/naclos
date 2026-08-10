'use client';

import { useMemo, useState } from 'react';
import type { ExpenseEntry, StaffAdvanceEntry, InventoryEntry, MenuSaleEntry } from '@/types';
import { RAW_MATERIALS } from '@/types';
import { computeClosureTotals } from '@/lib/calculations';
import ExpenseInput from './ExpenseInput';
import InventoryTracker from './InventoryTracker';
import MenuSalesCounter from './MenuSalesCounter';

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: Record<Step, string> = {
  1: 'Revenu',
  2: 'Dépenses',
  3: 'Stock',
  4: 'Ventes',
  5: 'Résumé',
};

export default function DailyEntryForm() {
  const [step, setStep] = useState<Step>(1);
  
  // Lock date strictly to today (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [businessDate] = useState<string>(todayStr);

  const [managerName, setManagerName] = useState('');
  const [grossRevenue, setGrossRevenue] = useState<number>(0);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [staffAdvances, setStaffAdvances] = useState<StaffAdvanceEntry[]>([]);
  const [inventory, setInventory] = useState<InventoryEntry[]>(
    RAW_MATERIALS.map((m) => ({
      materialCode: m.code,
      materialLabel: m.label,
      unit: m.unit,
      openingStock: 0,
      supplyPurchased: 0,
      consumedAmount: 0,
      physicalClosingCount: 0,
    }))
  );
  const [menuSales, setMenuSales] = useState<MenuSaleEntry[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<null | { success: boolean; message: string; flags?: string[] }>(null);

  const totals = useMemo(
    () => computeClosureTotals({ businessDate, managerName, grossRevenue, expenses, staffAdvances, inventory, menuSales }),
    [businessDate, managerName, grossRevenue, expenses, staffAdvances, inventory, menuSales]
  );

  async function handleSubmit() {
    setSubmitting(true);
    setResult(null);

    let receiptImageUrl: string | null = null;

    // Optional: Upload photo if selected
    if (receiptFile) {
      try {
        const formData = new FormData();
        formData.append('file', receiptFile);
        const uploadRes = await fetch('/api/upload-receipt', { method: 'POST', body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          receiptImageUrl = uploadData.publicUrl;
        }
      } catch (e) {
        console.error('Receipt upload failed, continuing submission:', e);
      }
    }

    try {
      const res = await fetch('/api/closure/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessDate,
          managerName,
          receiptImageUrl,
          grossRevenue,
          expenses,
          staffAdvances,
          inventory,
          menuSales,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, message: data.error || 'Échec de la soumission.' });
      } else {
        setResult({
          success: true,
          message: 'Clôture soumise et verrouillée avec succès. Le rapport a été envoyé.',
          flags: (data.inventoryFlags || []).map((f: any) => f.message),
        });
      }
    } catch (err) {
      setResult({ success: false, message: 'Erreur réseau. Vérifiez votre connexion et réessayez.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <StepIndicator step={step} />

      {step === 1 && (
        <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Date de Clôture</label>
            <input
              type="date"
              value={businessDate}
              readOnly
              className="w-full cursor-not-allowed rounded-lg border border-neutral-300 bg-neutral-100 p-3 text-neutral-600"
            />
            <p className="mt-1 text-xs text-neutral-400">La clôture doit être saisie le jour même.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Nom du Responsable</label>
            <input
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="Ex: Mehdi"
              className="w-full rounded-lg border border-neutral-300 p-3"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Revenu Brut Total (DH)</label>
            <input
              type="number"
              inputMode="decimal"
              value={grossRevenue || ''}
              onChange={(e) => setGrossRevenue(Number(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full rounded-lg border border-neutral-300 p-3 text-lg font-semibold"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Photo de la feuille / Reçu (Optionnel)</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => e.target.files?.[0] && setReceiptFile(e.target.files[0])}
              className="block w-full text-sm text-neutral-500 file:mr-4 file:rounded-lg file:border-0 file:bg-neutral-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-neutral-800"
            />
          </div>
        </section>
      )}

      {step === 2 && (
        <ExpenseInput
          expenses={expenses}
          setExpenses={setExpenses}
          staffAdvances={staffAdvances}
          setStaffAdvances={setStaffAdvances}
        />
      )}

      {step === 3 && <InventoryTracker inventory={inventory} setInventory={setInventory} />}

      {step === 4 && <MenuSalesCounter menuSales={menuSales} setMenuSales={setMenuSales} />}

      {step === 5 && (
        <SummaryStep
          businessDate={businessDate}
          managerName={managerName}
          grossRevenue={grossRevenue}
          totals={totals}
          submitting={submitting}
          onSubmit={handleSubmit}
          result={result}
        />
      )}

      <NavButtons step={step} setStep={setStep} disableNext={step === 1 && (!managerName || grossRevenue <= 0)} />
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center justify-between text-xs">
      {([1, 2, 3, 4, 5] as Step[]).map((s) => (
        <div key={s} className="flex flex-1 flex-col items-center">
          <div
            className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              s === step ? 'bg-neutral-900 text-white' : s < step ? 'bg-green-600 text-white' : 'bg-neutral-200 text-neutral-500'
            }`}
          >
            {s < step ? '✓' : s}
          </div>
          <span className="text-[10px] text-neutral-500">{STEP_LABELS[s]}</span>
        </div>
      ))}
    </div>
  );
}

function NavButtons({ step, setStep, disableNext }: { step: Step; setStep: (s: Step) => void; disableNext?: boolean }) {
  return (
    <div className="flex gap-3">
      {step > 1 && (
        <button
          onClick={() => setStep((step - 1) as Step)}
          className="flex-1 rounded-lg border border-neutral-300 bg-white py-3 font-medium text-neutral-700"
        >
          Retour
        </button>
      )}
      {step < 5 && (
        <button
          onClick={() => setStep((step + 1) as Step)}
          disabled={disableNext}
          className="flex-1 rounded-lg bg-neutral-900 py-3 font-medium text-white disabled:opacity-40"
        >
          Suivant
        </button>
      )}
    </div>
  );
}

function SummaryStep({
  businessDate,
  managerName,
  grossRevenue,
  totals,
  submitting,
  onSubmit,
  result,
}: {
  businessDate: string;
  managerName: string;
  grossRevenue: number;
  totals: ReturnType<typeof computeClosureTotals>;
  submitting: boolean;
  onSubmit: () => void;
  result: null | { success: boolean; message: string; flags?: string[] };
}) {
  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="font-semibold text-neutral-900">Résumé — {businessDate}</h2>
      <p className="text-sm text-neutral-500">Responsable: {managerName || '—'}</p>

      <div className="grid grid-cols-2 gap-3">
        <KpiTile label="Revenu Brut" value={grossRevenue} />
        <KpiTile label="Total Dépenses" value={totals.totalExpenses} />
        <KpiTile label="Avances Staff" value={totals.totalStaffAdvances} />
        <KpiTile label="Cash Net" value={totals.netCash} highlight />
      </div>

      {totals.inventoryFlags.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="mb-1 text-sm font-semibold text-red-700">⚠ {totals.inventoryFlags.length} écart(s) de stock</p>
          <ul className="list-inside list-disc text-sm text-red-600">
            {totals.inventoryFlags.map((f, i) => (
              <li key={i}>{f.message}</li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <div className={`rounded-lg p-3 text-sm ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {result.message}
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={submitting || (result?.success ?? false)}
        className="w-full rounded-lg bg-neutral-900 py-4 text-base font-semibold text-white disabled:opacity-50"
      >
        {submitting ? 'Envoi en cours…' : result?.success ? 'Clôture Envoyée ✓' : 'Soumettre la Clôture du Jour'}
      </button>

      {/* Reset & Delete Option for Manager Errors */}
      {result?.success && (
        <button
          type="button"
          onClick={async () => {
            if (confirm("Voulez-vous vraiment supprimer la clôture d'aujourd'hui et recommencer ?")) {
              const res = await fetch(`/api/closure/delete?date=${businessDate}`, { method: 'DELETE' });
              if (res.ok) {
                alert('Clôture supprimée avec succès.');
                window.location.reload();
              } else {
                alert('Erreur lors de la suppression.');
              }
            }
          }}
          className="w-full rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600 hover:bg-red-100"
        >
          Supprimer et recommencer
        </button>
      )}

      <p className="text-center text-xs text-neutral-400">
        Une fois soumise, la clôture est verrouillée. Seul un administrateur peut la déverrouiller.
      </p>
    </section>
  );
}

function KpiTile({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-900'}`}>
      <div className={`text-xs ${highlight ? 'text-neutral-300' : 'text-neutral-500'}`}>{label}</div>
      <div className="text-lg font-bold">{value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH</div>
    </div>
  );
}