'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CORE_STOCK_ITEMS = [
  { code: 'dinde', label: 'Dinde', unit: 'kg' },
  { code: 'vh', label: 'Viande Hachée (VH)', unit: 'kg' },
  { code: 'crispy', label: 'Crispy', unit: 'kg' },
  { code: 'mozarella', label: 'Mozzarella', unit: 'kg' },
  { code: 'tortilla', label: 'Tortilla', unit: 'pack' },
  { code: 'burger', label: 'Pain Burger', unit: 'unit' },
  { code: 'soda', label: 'Soda', unit: 'unit' },
  { code: 'eau_p', label: 'Eau (Petite)', unit: 'unit' },
  { code: 'eau_g', label: 'Eau (Grande)', unit: 'unit' },
  { code: 'fruit_de_mer', label: 'Fruits de Mer', unit: 'kg' }
];

const PREDEFINED_EXPENSES = ['Fournisseur', 'Frite', 'VH', 'Chikas', 'Salem', 'Autre...'];

const STORAGE_KEY = 'naclos_tayeb_form_draft_v1';

export default function DailyEntryForm() {
  const router = useRouter();
  const managerName = 'Tayeb';

  // SECURITY GUARD
  useEffect(() => {
    const authRole = sessionStorage.getItem('naclos_role');
    const isAuth = sessionStorage.getItem('naclos_authenticated');
    if (isAuth !== 'true' || (authRole !== 'tayeb' && authRole !== 'admin')) {
      router.push('/');
    }
  }, [router]);

  const [businessDate, setBusinessDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY}_date`);
      if (saved) return saved;
    }
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [grossRevenue, setGrossRevenue] = useState<number | ''>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY}_rev`);
      if (saved !== null && saved !== '') return Number(saved);
    }
    return '';
  });

  const [notes, setNotes] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(`${STORAGE_KEY}_notes`) || '';
    return '';
  });

  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(`${STORAGE_KEY}_receipt`);
    return null;
  });

  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [availableStaff, setAvailableStaff] = useState<string[]>([]);

  const [expenses, setExpenses] = useState<{ category: string; customLabel: string; amount: number | '' }[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY}_expenses`);
      if (saved) return JSON.parse(saved);
    }
    return [{ category: '', customLabel: '', amount: '' }];
  });

  const [staffAdvances, setStaffAdvances] = useState<{ selection: string; customName: string; amount: number | '' }[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY}_advances`);
      if (saved) return JSON.parse(saved);
    }
    return [{ selection: '', customName: '', amount: '' }];
  });

  const [stockCounts, setStockCounts] = useState<{ [key: string]: number | '' }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY}_stock`);
      if (saved) return JSON.parse(saved);
    }
    return Object.fromEntries(CORE_STOCK_ITEMS.map((item) => [item.code, '']));
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // AUTO-SAVE DRAFT
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_date`, businessDate);
    localStorage.setItem(`${STORAGE_KEY}_rev`, String(grossRevenue));
    localStorage.setItem(`${STORAGE_KEY}_notes`, notes);
    if (receiptImageUrl) localStorage.setItem(`${STORAGE_KEY}_receipt`, receiptImageUrl);
    localStorage.setItem(`${STORAGE_KEY}_expenses`, JSON.stringify(expenses));
    localStorage.setItem(`${STORAGE_KEY}_advances`, JSON.stringify(staffAdvances));
    localStorage.setItem(`${STORAGE_KEY}_stock`, JSON.stringify(stockCounts));
  }, [businessDate, grossRevenue, notes, receiptImageUrl, expenses, staffAdvances, stockCounts]);

  useEffect(() => {
    const fetchStaffForMonth = async () => {
      if (!businessDate) return;
      
      let monthStr = '';
      if (businessDate.includes('-') && businessDate.indexOf('-') === 4) {
        monthStr = businessDate.substring(0, 7);
      } else {
        const parts = businessDate.split(/[\/\-]/);
        if (parts.length === 3) {
          const year = parts[0].length === 4 ? parts[0] : parts[2];
          const month = parts[0].length === 4 ? parts[1] : parts[0];
          monthStr = `${year}-${month.padStart(2, '0')}`;
        }
      }

      if (!monthStr || monthStr.length !== 7) return;

      const timestamp = Date.now();
      try {
        const res = await fetch(`/api/dashboard/summary?month=${monthStr}&_t=${timestamp}`);
        if (res.ok) {
          const data = await res.json();
          if (data.salaries) {
            setAvailableStaff(data.salaries.map((s: any) => s.name));
          }
        }
      } catch (err) {
        console.error('Failed to fetch staff list', err);
      }
    };
    fetchStaffForMonth();
  }, [businessDate]);

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.removeItem(STORAGE_KEY + '_date');
    localStorage.removeItem(STORAGE_KEY + '_rev');
    localStorage.removeItem(STORAGE_KEY + '_notes');
    localStorage.removeItem(STORAGE_KEY + '_receipt');
    localStorage.removeItem(STORAGE_KEY + '_expenses');
    localStorage.removeItem(STORAGE_KEY + '_advances');
    localStorage.removeItem(STORAGE_KEY + '_stock');
    router.push('/');
  };

  const addExpenseRow = () => setExpenses([...expenses, { category: '', customLabel: '', amount: '' }]);
  const removeExpenseRow = (index: number) => setExpenses(expenses.filter((_, i) => i !== index));
  const updateExpense = (index: number, field: 'category' | 'customLabel' | 'amount', value: any) => {
    const updated = [...expenses];
    updated[index][field] = value as never;
    setExpenses(updated);
  };

  const addAdvanceRow = () => setStaffAdvances([...staffAdvances, { selection: '', customName: '', amount: '' }]);
  const removeAdvanceRow = (index: number) => setStaffAdvances(staffAdvances.filter((_, i) => i !== index));
  const updateAdvance = (index: number, field: 'selection' | 'customName' | 'amount', value: any) => {
    const updated = [...staffAdvances];
    updated[index][field] = value as never;
    setStaffAdvances(updated);
  };

  const updateStockCount = (code: string, value: any) => {
    setStockCounts({ ...stockCounts, [code]: value === '' ? '' : Number(value) });
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload-receipt', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        setReceiptImageUrl(data.url);
      } else {
        alert(`ERREUR API: ${data.error || 'Erreur inconnue'}`);
      }
    } catch (err: any) {
      alert(`ERREUR CODE: ${err.message}`);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const totalAdvances = staffAdvances.reduce((sum, adv) => sum + (Number(adv.amount) || 0), 0);
  const netCash = (Number(grossRevenue) || 0) - totalExpenses - totalAdvances;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // REQUIREMENT 1: Block submission if receipt photo is missing
    if (!receiptImageUrl) {
      setMessage({ type: 'error', text: 'Veuillez joindre la photo du ticket de caisse avant de soumettre.' });
      return;
    }

    setLoading(true);

    const payload = {
      businessDate: businessDate,
      storeId: 'main',
      managerName,
      grossRevenue: Number(grossRevenue) || 0,
      receiptImageUrl,
      notes,
      expenses: expenses
        .map((exp) => ({
          label: exp.category === 'Autre...' ? exp.customLabel : exp.category,
          amount: Number(exp.amount),
        }))
        .filter((exp) => exp.label.trim() !== '' && exp.amount > 0),
      staffAdvances: staffAdvances
        .map((adv) => ({
          employeeName: adv.selection === 'Autre...' ? adv.customName : adv.selection,
          amount: Number(adv.amount),
        }))
        .filter((adv) => adv.employeeName.trim() !== '' && adv.amount > 0),
      inventory: CORE_STOCK_ITEMS.map((item) => ({
        materialCode: item.code,
        materialLabel: item.label,
        physicalClosingCount: Number(stockCounts[item.code]) || 0,
      })),
    };

    try {
      const res = await fetch('/api/closure/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la soumission.');

      // REQUIREMENT 2: Trigger success screen modal
      setSuccess(true);
      
      // Clear draft data
      localStorage.removeItem(STORAGE_KEY + '_date');
      localStorage.removeItem(STORAGE_KEY + '_rev');
      localStorage.removeItem(STORAGE_KEY + '_notes');
      localStorage.removeItem(STORAGE_KEY + '_receipt');
      localStorage.removeItem(STORAGE_KEY + '_expenses');
      localStorage.removeItem(STORAGE_KEY + '_advances');
      localStorage.removeItem(STORAGE_KEY + '_stock');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // SUCCESS SCREEN
  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">THANK YOU TAYIB</h2>
          
          <div className="my-6 w-24 h-24 rounded-full border-4 border-green-500 flex items-center justify-center bg-green-50 animate-bounce">
            <svg className="w-12 h-12 text-green-600 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h3 className="text-lg font-bold text-blue-600 uppercase tracking-widest mb-2"> Submitted Successfully</h3>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-8">Clôture enregistrée avec succès</p>

          <button
            onClick={() => router.push('/')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-6 rounded-full shadow-lg transition transform active:scale-95 text-base tracking-wide"
          >
            Continue 
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md space-y-8 text-gray-800">
      <div className="flex justify-between items-center border-b pb-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-black bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition"
        >
          ← Retour / Déconnexion
        </button>
        <span className="text-xs font-semibold text-gray-400">Naclos Operations</span>
      </div>

      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Saisie du Jour — Naclos</h2>
        <p className="text-sm text-gray-500 mb-2">
          Connecté en tant que: <span className="font-bold text-gray-800">{managerName}</span>
        </p>
        
        <div className="flex items-center gap-2 mt-2">
          <label className="text-sm text-gray-600 font-bold">Date de la Clôture :</label>
          <input 
            type="date" 
            value={businessDate} 
            onChange={(e) => setBusinessDate(e.target.value)} 
            className="border p-1.5 rounded-lg text-sm outline-none font-bold text-black" 
          />
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg font-medium text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* 1. Recette Brute */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 text-gray-800">1. Recette Brute</h3>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Recette Brute (MAD) *</label>
          <input
            type="number"
            required
            min="0"
            step="0.001"
            placeholder="0.00"
            value={grossRevenue}
            onChange={(e) => setGrossRevenue(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-black outline-none font-mono text-lg font-bold text-green-700"
          />
        </div>
      </section>

      {/* 2. Dépenses du Jour */}
      <section className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-lg font-semibold text-gray-800">2. Dépenses du Jour</h3>
          <span className="text-sm font-semibold text-red-600">Total: {totalExpenses} MAD</span>
        </div>

        {expenses.map((exp, idx) => (
          <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-gray-50 p-2 rounded-lg border">
            <div className="flex-1 w-full flex flex-col sm:flex-row gap-2">
              <select
                value={exp.category}
                onChange={(e) => updateExpense(idx, 'category', e.target.value)}
                className={`p-2.5 border rounded-lg text-sm outline-none bg-white ${exp.category === 'Autre...' ? 'sm:w-1/3' : 'w-full'}`}
              >
                <option value="" disabled>Sélectionnez une dépense...</option>
                {PREDEFINED_EXPENSES.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              
              {exp.category === 'Autre...' && (
                <input
                  type="text"
                  placeholder="Précisez la dépense..."
                  value={exp.customLabel}
                  onChange={(e) => updateExpense(idx, 'customLabel', e.target.value)}
                  className="flex-1 p-2.5 border rounded-lg text-sm outline-none"
                />
              )}
            </div>
            
            <div className="flex w-full sm:w-auto gap-2">
              <input
                type="number"
                min="0"
                step="0.001"
                placeholder="Montant (MAD)"
                value={exp.amount}
                onChange={(e) => updateExpense(idx, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full sm:w-32 p-2.5 border rounded-lg text-sm font-mono outline-none"
              />
              {expenses.length > 1 && (
                <button type="button" onClick={() => removeExpenseRow(idx)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-bold">✕</button>
              )}
            </div>
          </div>
        ))}
        <button type="button" onClick={addExpenseRow} className="text-xs font-bold text-blue-600 hover:underline">+ Ajouter une autre dépense</button>
      </section>

      {/* 3. Avances sur Salaire */}
      <section className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-lg font-semibold text-gray-800">3. Avances sur Salaire (Personnel)</h3>
          <span className="text-sm font-semibold text-amber-600">Total Avances: {totalAdvances} MAD</span>
        </div>

        {staffAdvances.map((adv, idx) => (
          <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-gray-50 p-2 rounded-lg border">
            <div className="flex-1 w-full flex flex-col sm:flex-row gap-2">
              <select
                value={adv.selection}
                onChange={(e) => updateAdvance(idx, 'selection', e.target.value)}
                className={`p-2.5 border rounded-lg text-sm outline-none bg-white ${adv.selection === 'Autre...' ? 'sm:w-1/3' : 'w-full'}`}
              >
                <option value="" disabled>Sélectionnez l'employé...</option>
                {availableStaff.map(staff => (
                  <option key={staff} value={staff}>{staff}</option>
                ))}
                <option value="Autre...">Autre...</option>
              </select>
              
              {adv.selection === 'Autre...' && (
                <input
                  type="text"
                  placeholder="Nom de l'employé..."
                  value={adv.customName}
                  onChange={(e) => updateAdvance(idx, 'customName', e.target.value)}
                  className="flex-1 p-2.5 border rounded-lg text-sm outline-none"
                />
              )}
            </div>

            <div className="flex w-full sm:w-auto gap-2">
              <input
                type="number"
                min="0"
                step="0.001"
                placeholder="Montant (MAD)"
                value={adv.amount}
                onChange={(e) => updateAdvance(idx, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full sm:w-32 p-2.5 border rounded-lg text-sm font-mono outline-none"
              />
              {staffAdvances.length > 1 && (
                <button type="button" onClick={() => removeAdvanceRow(idx)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-bold">✕</button>
              )}
            </div>
          </div>
        ))}
        <button type="button" onClick={addAdvanceRow} className="text-xs font-bold text-blue-600 hover:underline">+ Ajouter une avance</button>
      </section>

      {/* 4. Stock Réel */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 text-gray-800">4. État du Stock Réel (Fin de Journée)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {CORE_STOCK_ITEMS.map((item) => (
            <div key={item.code} className="p-3 border rounded-lg bg-gray-50 space-y-1">
              <label className="block text-xs font-bold text-gray-700">{item.label} ({item.unit})</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Quantité"
                value={stockCounts[item.code]}
                onChange={(e) => updateStockCount(item.code, e.target.value)}
                className="w-full p-2 border rounded bg-white text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          ))}
        </div>
      </section>

      {/* 5. Reçu & Remarques (Mandatory Photo Check Added) */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2 text-gray-800">
          5. Justificatif & Remarques <span className="text-red-600 text-sm">* (Photo Obligatoire)</span>
        </h3>
        <div className="p-4 border-2 border-dashed rounded-lg text-center bg-gray-50 space-y-2">
          <input type="file" accept="image/*" onChange={handleReceiptUpload} className="text-sm" />
          {uploadingReceipt && <p className="text-xs text-blue-600">Téléchargement en cours...</p>}
          {receiptImageUrl && <p className="text-xs text-green-600 font-bold">✓ Reçu téléchargé avec succès !</p>}
        </div>
        <textarea
          rows={3}
          placeholder="Remarques ou observations..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full p-3 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-black"
        />
      </section>

      {/* Summary Box */}
      <div className="bg-gray-900 text-white p-4 rounded-xl flex justify-between items-center font-mono">
        <div>
          <span className="text-xs text-gray-400 block uppercase">Net Cash Réel Attendu</span>
          <span className="text-xl font-bold text-green-400">{netCash} MAD</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || uploadingReceipt}
        className="w-full py-3.5 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition disabled:opacity-50 text-base"
      >
        {loading ? 'Enregistrement...' : 'Soumettre la Clôture'}
      </button>
    </form>
  );
}