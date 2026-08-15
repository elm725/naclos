'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Removed 'chika' and 'frites' from the tracked columns
const TRACKED_COLUMNS = [
  { id: 'dinde', label: 'DINDE', isKg: true, match: ['dinde'] },
  { id: 'vh', label: 'VH', isKg: true, match: ['vh', 'viande hachée'] },
  { id: 'mozz', label: 'MOZZ', isKg: true, match: ['mozzarella', 'mozarella'] },
  { id: 'crispy', label: 'CRISPY', isKg: true, match: ['crispy', 'crispy_chicken'] },
  { id: 'tortilla', label: 'TORTILLA', isKg: false, match: ['tortilla'] },
  { id: 'burger', label: 'BURGER', isKg: false, match: ['burger', 'burger_buns'] },
  { id: 'soda', label: 'SODA', isKg: false, match: ['soda', 'soda_cans'] },
  { id: 'eau_p', label: 'EAU P', isKg: false, match: ['eau_p', 'eau_petite'] },
  { id: 'eau_g', label: 'EAU G', isKg: false, match: ['eau_g', 'eau_grande'] }
];

export default function DailyReportPage() {
  const router = useRouter();
  const [closures, setClosures] = useState<any[]>([]);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const isAuth = sessionStorage.getItem('naclos_authenticated');
    const role = sessionStorage.getItem('naclos_role');
    if (isAuth !== 'true' || (role !== 'noureddine' && role !== 'admin')) {
      router.push('/');
      return;
    }

    Promise.all([
      fetch('/api/closure/list?_t=' + Date.now()).then(res => res.json()),
      fetch('/api/supply?_t=' + Date.now()).then(res => res.json())
    ])
      .then(([closureData, supplyData]) => {
        if (closureData.error) {
          setErrorMsg(closureData.error);
        } else {
          setClosures(closureData.closures || []);
          setSupplies(supplyData.supplies || []);
          if (closureData.closures && closureData.closures.length > 0) {
            setSelectedDate(closureData.closures[0].business_date);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setLoading(false);
      });
  }, [router]);

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/');
  };

  if (loading) return <div className="p-10 text-center font-bold text-lg">Chargement des données...</div>;
  if (errorMsg) return <div className="p-10 text-center font-bold text-red-600">Erreur Serveur: {errorMsg}</div>;
  if (closures.length === 0) return <div className="p-10 text-center font-bold">Aucune clôture trouvée dans la base de données.</div>;

  const closure = closures.find(c => c.business_date === selectedDate) || closures[0];
  
  const prevClosure = closures
    .filter(c => c.business_date < selectedDate)
    .sort((a, b) => new Date(b.business_date).getTime() - new Date(a.business_date).getTime())[0];

  const currentSupply = supplies.find(s => s.business_date === selectedDate);

  // SMART CONVERSION FUNCTION
  const getStockValue = (targetClosure: any, column: typeof TRACKED_COLUMNS[0]) => {
    if (!targetClosure) return 0;
    const inv = targetClosure.inventory_logs?.find((i: any) => {
      const code = (i.raw_materials?.code || i.materialCode || '').toLowerCase();
      return column.match.includes(code);
    });
    
    let val = Number(inv?.physical_closing_count ?? inv?.physicalClosingCount ?? 0);
    
    // If the item is tracked in KG and Tayeb entered a number > 20, 
    // we assume he entered grams and convert it to KG automatically.
    if (column.isKg && val > 20) {
      val = val / 1000;
    }
    
    return val;
  };

  const getSupplyValue = (column: typeof TRACKED_COLUMNS[0]) => {
    if (!currentSupply || !currentSupply.items) return 0;
    const item = currentSupply.items.find((i: any) => {
      const code = (i.code || '').toLowerCase();
      return column.match.includes(code);
    });
    return Number(item?.quantity || 0);
  };

  const formatNum = (num: number) => {
    if (num === 0) return '0';
    return Number(num.toFixed(3)).toLocaleString('fr-FR');
  };

  const grossRevenue = Number(closure.gross_revenue || 0);
  const totalExpenses = Number(closure.total_expenses || 0);
  const calculatedNet = grossRevenue - totalExpenses;

  return (
    <div className="min-h-screen bg-white text-black p-4 text-sm font-sans" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Top Controls */}
      <div className="flex justify-between items-center mb-6 no-print bg-gray-50 p-4 border border-gray-200 rounded-lg">
        <button onClick={handleLogout} className="bg-black text-white px-5 py-2 rounded-lg font-bold hover:bg-gray-800 transition">
          ← Déconnexion
        </button>
        <div className="flex items-center gap-3">
          <label className="font-bold text-gray-700 uppercase tracking-wide text-xs">Sélectionner Date:</label>
          <select 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border-2 border-black p-2 rounded font-bold bg-white cursor-pointer outline-none focus:ring-2 focus:ring-blue-500"
          >
            {closures.map(c => (
              <option key={c.id} value={c.business_date}>{c.business_date}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. TOP INVENTORY TABLE (Stock & Alimentation) */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full border-collapse border border-black text-center whitespace-nowrap">
          <thead>
            <tr>
              <th className="border border-black w-40 bg-[#104e7a]"></th>
              {TRACKED_COLUMNS.map(col => (
                <th key={col.id} className="border border-black bg-[#104e7a] text-white px-3 py-2 text-xs font-bold uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black bg-[#104e7a] text-white font-bold text-left px-3 py-2 uppercase">Stock</td>
              {TRACKED_COLUMNS.map(col => (
                <td key={col.id} className="border border-black font-bold text-base bg-white">
                  {formatNum(getStockValue(prevClosure, col))}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border border-black bg-[#104e7a] text-white font-bold text-left px-3 py-2 uppercase">Alimentation</td>
              {TRACKED_COLUMNS.map(col => (
                <td key={col.id} className="border border-black font-bold text-base bg-white">
                  {formatNum(getSupplyValue(col))}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2. MIDDLE SECTION (Revenue & Expenses) */}
      <div className="flex flex-col lg:flex-row gap-8 mb-8 items-start justify-start">
        
        {/* Left: Revenue & Date */}
        <div className="flex flex-col gap-6 w-full lg:w-64">
          <div className="flex border-2 border-black">
            <div className="bg-[#fff200] text-black font-bold p-4 flex-1 flex items-center justify-center text-center uppercase tracking-wide">
              Totale Revenue
            </div>
            <div className="bg-[#fff200] text-black font-bold p-4 w-28 text-center border-l-2 border-black text-xl">
              {grossRevenue}
            </div>
          </div>
          <div className="text-4xl font-black mt-4 pl-2">
            {new Date(closure.business_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </div>
        </div>

        {/* Middle: Depense Table */}
        <div className="flex border-2 border-black w-full lg:w-80 shadow-sm">
          <div className="bg-[#e31818] text-white font-bold tracking-widest text-3xl flex items-center justify-center p-3" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            DEPENSE
          </div>
          <div className="flex-1 flex flex-col bg-white">
            {closure.expenses?.length > 0 ? (
              closure.expenses.map((e: any, i: number) => (
                <div key={i} className="flex border-b border-black last:border-b-0">
                  <div className="flex-1 border-r border-black px-3 py-1.5 bg-[#f4a261] font-bold truncate capitalize text-sm">{e.label}</div>
                  <div className="w-24 text-center py-1.5 font-bold text-base bg-white">{e.amount}</div>
                </div>
              ))
            ) : (
              <div className="flex border-b border-black p-2 italic text-gray-500 justify-center">Aucune dépense</div>
            )}
            <div className="flex border-t-2 border-black">
              <div className="flex-1 border-r border-black px-3 py-2 font-black bg-[#fff200] text-center uppercase tracking-wide">TOTAL</div>
              <div className="w-24 text-center py-2 font-black bg-[#fff200] text-base">{totalExpenses}</div>
            </div>
          </div>
        </div>

        {/* Right: NET & Advances */}
        <div className="flex flex-col items-center justify-center w-full lg:w-64 lg:pt-16">
          <div className="flex border-2 border-black w-full shadow-sm">
            <div className="flex-1 bg-[#fff200] text-black font-black text-center p-3 border-r-2 border-black text-xl tracking-wider">NET</div>
            <div className="flex-1 bg-white font-black text-center p-3 text-xl">{calculatedNet}</div>
          </div>
          {closure.staff_advances?.length > 0 && (
            <div className="mt-4 text-xs font-semibold text-center tracking-wide text-gray-800">
              {closure.staff_advances.map((a: any) => `Avance ${a.employee_name || a.employeeName} ${a.amount} DH`).join(' - ')}
            </div>
          )}
        </div>

      </div>

      {/* 3. BOTTOM INVENTORY TABLE (Consommation & Reste) */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-black text-center whitespace-nowrap">
          <thead>
            <tr>
              <th className="border border-black w-40 bg-[#104e7a]"></th>
              {TRACKED_COLUMNS.map(col => (
                <th key={col.id} className="border border-black bg-[#104e7a] text-white px-3 py-2 text-xs font-bold uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black bg-[#104e7a] text-white font-bold text-left px-3 py-2 uppercase">Consommation</td>
              {TRACKED_COLUMNS.map(col => {
                const opening = getStockValue(prevClosure, col);
                const supply = getSupplyValue(col);
                const remaining = getStockValue(closure, col);
                
                // Consommation = Stock + Alimentation - Reste
                const consumed = opening + supply - remaining;
                
                return (
                  <td key={col.id} className="border border-black font-bold text-base bg-white">
                    {formatNum(consumed)}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="border border-black bg-[#104e7a] text-white font-bold text-left px-3 py-2 uppercase">Reste</td>
              {TRACKED_COLUMNS.map(col => (
                <td key={col.id} className="border border-black font-bold text-base bg-white">
                  {formatNum(getStockValue(closure, col))}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}