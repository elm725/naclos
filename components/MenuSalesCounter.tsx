'use client';

import { useState } from 'react';
import type { MenuSaleEntry } from '@/types';
import { MENU_CATALOG } from '@/types';

interface Props {
  menuSales: MenuSaleEntry[];
  setMenuSales: (sales: MenuSaleEntry[]) => void;
}

export default function MenuSalesCounter({ menuSales, setMenuSales }: Props) {
  const [activeCategory, setActiveCategory] = useState(MENU_CATALOG[0].categoryCode);

  function getQty(categoryCode: string, itemLabel: string): number {
    return menuSales.find((s) => s.categoryCode === categoryCode && s.itemLabel === itemLabel)?.quantitySold ?? 0;
  }

  function setQty(categoryCode: string, itemLabel: string, qty: number) {
    const itemCode = itemLabel.toLowerCase().replace(/\s+/g, '_');
    const clamped = Math.max(0, qty);
    const existingIdx = menuSales.findIndex((s) => s.categoryCode === categoryCode && s.itemLabel === itemLabel);

    if (existingIdx >= 0) {
      const updated = [...menuSales];
      updated[existingIdx] = { ...updated[existingIdx], quantitySold: clamped };
      setMenuSales(updated);
    } else {
      setMenuSales([...menuSales, { categoryCode, itemCode, itemLabel, quantitySold: clamped }]);
    }
  }

  const totalItemsSold = menuSales.reduce((s, i) => s + i.quantitySold, 0);
  const activeItems = MENU_CATALOG.find((c) => c.categoryCode === activeCategory)?.items ?? [];

  return (
    <section className="space-y-3">
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900">Ventes par Article</h2>
          <span className="text-sm text-neutral-500">{totalItemsSold} articles vendus</span>
        </div>
      </div>

      {/* Category tabs */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {MENU_CATALOG.map((cat) => (
          <button
            key={cat.categoryCode}
            onClick={() => setActiveCategory(cat.categoryCode)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
              activeCategory === cat.categoryCode ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {cat.categoryLabel}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {activeItems.map((item) => {
          const qty = getQty(activeCategory, item);
          return (
            <div key={item} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3">
              <span className="font-medium text-neutral-900">{item}</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQty(activeCategory, item, qty - 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-lg font-bold text-neutral-700"
                >
                  −
                </button>
                <span className="w-6 text-center text-lg font-bold">{qty}</span>
                <button
                  onClick={() => setQty(activeCategory, item, qty + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-lg font-bold text-white"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
