'use client';

import { useState } from 'react';
import type { InventoryEntry } from '@/types';
import { calculateRemainingStock, calculateVariance, isInventoryFlagged } from '@/lib/calculations';

interface Props {
  inventory: InventoryEntry[];
  setInventory: (inv: InventoryEntry[]) => void;
}

export default function InventoryTracker({ inventory, setInventory }: Props) {
  const [expandedCode, setExpandedCode] = useState<string | null>(inventory[0]?.materialCode ?? null);

  function updateField(code: string, field: keyof InventoryEntry, value: number) {
    setInventory(inventory.map((item) => (item.materialCode === code ? { ...item, [field]: value } : item)));
  }

  const flaggedCount = inventory.filter((i) => isInventoryFlagged(i)).length;

  return (
    <section className="space-y-3">
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900">Suivi du Stock</h2>
          {flaggedCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">{flaggedCount} écart(s)</span>
          )}
        </div>
        <p className="text-xs text-neutral-500">Entrez le stock initial, les achats, la consommation, et le comptage physique final.</p>
      </div>

      {inventory.map((item) => {
        const expected = calculateRemainingStock(item);
        const variance = calculateVariance(item);
        const flagged = isInventoryFlagged(item);
        const isOpen = expandedCode === item.materialCode;

        return (
          <div key={item.materialCode} className={`rounded-xl border bg-white p-4 ${flagged ? 'border-red-300' : 'border-neutral-200'}`}>
            <button
              onClick={() => setExpandedCode(isOpen ? null : item.materialCode)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="font-medium text-neutral-900">
                {item.materialLabel} <span className="text-xs text-neutral-400">({item.unit})</span>
              </span>
              <div className="flex items-center gap-2">
                {flagged && <span className="text-red-500">⚠</span>}
                <span className="text-neutral-400">{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>

            {isOpen && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="Stock Initial" value={item.openingStock} onChange={(v) => updateField(item.materialCode, 'openingStock', v)} />
                  <NumberField label="Achats" value={item.supplyPurchased} onChange={(v) => updateField(item.materialCode, 'supplyPurchased', v)} />
                  <NumberField label="Consommation" value={item.consumedAmount} onChange={(v) => updateField(item.materialCode, 'consumedAmount', v)} />
                  <NumberField
                    label="Comptage Physique"
                    value={item.physicalClosingCount}
                    onChange={(v) => updateField(item.materialCode, 'physicalClosingCount', v)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-2 text-sm">
                  <span className="text-neutral-500">Stock Calculé Attendu</span>
                  <span className="font-semibold">
                    {expected.toFixed(2)} {item.unit}
                  </span>
                </div>

                {flagged && (
                  <div className="rounded-lg bg-red-50 p-2 text-sm font-semibold text-red-700">
                    {variance < 0
                      ? `Manque ${Math.abs(variance).toFixed(2)} ${item.unit} ${item.materialLabel}`
                      : `Surplus ${variance.toFixed(2)} ${item.unit} ${item.materialLabel}`}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-neutral-500">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-lg border border-neutral-300 p-2.5 text-sm"
      />
    </div>
  );
}
