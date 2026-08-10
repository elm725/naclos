'use client';

import { useState } from 'react';
import type { ExpenseEntry, StaffAdvanceEntry } from '@/types';
import { EXPENSE_CATEGORIES } from '@/types';

interface Props {
  expenses: ExpenseEntry[];
  setExpenses: (e: ExpenseEntry[]) => void;
  staffAdvances: StaffAdvanceEntry[];
  setStaffAdvances: (a: StaffAdvanceEntry[]) => void;
}

export default function ExpenseInput({ expenses, setExpenses, staffAdvances, setStaffAdvances }: Props) {
  const [categoryCode, setCategoryCode] = useState(EXPENSE_CATEGORIES[0].code);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState<number | ''>('');

  const [employeeName, setEmployeeName] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState<number | ''>('');

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalAdvances = staffAdvances.reduce((s, a) => s + a.amount, 0);

  function addExpense() {
    if (!label.trim() || !amount || amount <= 0) return;
    setExpenses([...expenses, { categoryCode, label: label.trim(), amount: Number(amount) }]);
    setLabel('');
    setAmount('');
  }

  function removeExpense(idx: number) {
    setExpenses(expenses.filter((_, i) => i !== idx));
  }

  function addAdvance() {
    if (!employeeName.trim() || !advanceAmount || advanceAmount <= 0) return;
    setStaffAdvances([...staffAdvances, { employeeName: employeeName.trim(), amount: Number(advanceAmount) }]);
    setEmployeeName('');
    setAdvanceAmount('');
  }

  function removeAdvance(idx: number) {
    setStaffAdvances(staffAdvances.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-5">
      {/* Expenses */}
      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-neutral-900">Dépenses du Jour</h2>

        <div className="mb-3 space-y-2">
          <select value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} className="w-full rounded-lg border border-neutral-300 p-3">
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Nom (ex: Sac de farine)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 p-3"
          />
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              placeholder="Prix en DH"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="flex-1 rounded-lg border border-neutral-300 p-3"
            />
            <button onClick={addExpense} className="rounded-lg bg-neutral-900 px-5 font-medium text-white">
              Ajouter
            </button>
          </div>
        </div>

        <ul className="divide-y divide-neutral-100">
          {expenses.map((e, i) => (
            <li key={i} className="flex items-center justify-between py-2 text-sm">
              <div>
                <span className="font-medium">{e.label}</span>
                <span className="ml-2 text-neutral-400">{EXPENSE_CATEGORIES.find((c) => c.code === e.categoryCode)?.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{e.amount.toFixed(2)} DH</span>
                <button onClick={() => removeExpense(i)} className="text-red-500">
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex justify-between border-t border-neutral-200 pt-3 font-semibold">
          <span>Total Dépenses</span>
          <span>{totalExpenses.toFixed(2)} DH</span>
        </div>
      </section>

      {/* Staff Advances */}
      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-neutral-900">Avances Personnel (Avances en DH)</h2>

        <div className="mb-3 flex gap-2">
          <input
            type="text"
            placeholder="Nom employé"
            value={employeeName}
            onChange={(e) => setEmployeeName(e.target.value)}
            className="flex-1 rounded-lg border border-neutral-300 p-3"
          />
          <input
            type="number"
            inputMode="decimal"
            placeholder="Montant"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-28 rounded-lg border border-neutral-300 p-3"
          />
          <button onClick={addAdvance} className="rounded-lg bg-neutral-900 px-4 font-medium text-white">
            +
          </button>
        </div>

        <ul className="divide-y divide-neutral-100">
          {staffAdvances.map((a, i) => (
            <li key={i} className="flex items-center justify-between py-2 text-sm">
              <span className="font-medium">{a.employeeName}</span>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{a.amount.toFixed(2)} DH</span>
                <button onClick={() => removeAdvance(i)} className="text-red-500">
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex justify-between border-t border-neutral-200 pt-3 font-semibold">
          <span>Total Avances</span>
          <span>{totalAdvances.toFixed(2)} DH</span>
        </div>
      </section>
    </div>
  );
}
