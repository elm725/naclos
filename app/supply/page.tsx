'use client';
import React, { useState } from 'react';
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
];

export default function SupplyEntryPage() {
  const router = useRouter();
  const [businessDate, setBusinessDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplies, setSupplies] = useState<{ [key: string]: number | '' }>(
    Object.fromEntries(CORE_STOCK_ITEMS.map((item) => [item.code, '']))
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const updateSupply = (code: string, value: any) => {
    setSupplies({ ...supplies, [code]: value === '' ? '' : Number(value) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    const itemsBought = CORE_STOCK_ITEMS.map(item => ({
      code: item.code,
      label: item.label,
      quantity: Number(supplies[item.code]) || 0,
      unit: item.unit
    })).filter(i => i.quantity > 0);

    try {
      const res = await fetch('/api/supply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessDate, buyerName: 'Salem', items: itemsBought }),
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        throw new Error(data.error || 'Erreur inconnue du serveur.');
      }
      
      setMessage({ type: 'success', text: 'Achats enregistrés avec succès !' });
      setSupplies(Object.fromEntries(CORE_STOCK_ITEMS.map((item) => [item.code, ''])));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md space-y-6">
        <div className="flex justify-between items-center border-b pb-4">
          <button type="button" onClick={() => { sessionStorage.clear(); router.push('/'); }} className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">← Déconnexion</button>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Saisie des Achats — Salem</h2>
          <div className="flex items-center gap-2 mt-2">
            <label className="text-sm text-gray-600 font-bold">Date d'achat :</label>
            <input type="date" value={businessDate} onChange={(e) => setBusinessDate(e.target.value)} className="border p-1.5 rounded-lg text-sm outline-none font-bold" />
          </div>
        </div>
        
        {message && (
          <div className={`p-4 rounded-lg text-sm font-bold ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message.text}
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CORE_STOCK_ITEMS.map((item) => (
            <div key={item.code} className="p-3 border rounded-lg bg-gray-50 flex justify-between items-center">
              <label className="text-xs font-bold text-gray-700">{item.label} ({item.unit})</label>
              <input type="number" min="0" step="0.01" placeholder="Qté" value={supplies[item.code]} onChange={(e) => updateSupply(item.code, e.target.value)} className="w-20 p-2 border rounded text-sm font-bold outline-none" />
            </div>
          ))}
        </div>
        <button type="submit" disabled={loading} className="w-full py-3.5 bg-black text-white font-bold rounded-xl">{loading ? 'Enregistrement...' : 'Soumettre les Achats'}</button>
      </form>
    </div>
  );
}
