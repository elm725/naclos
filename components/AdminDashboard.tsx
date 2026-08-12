'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

export default function AdminDashboardPage() {
  const router = useRouter();
  const [closures, setClosures] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
  
  const [selectedClosure, setSelectedClosure] = useState<any | null>(null);

  // --- MONTHLY SUMMARY STATE ---
  const [fixedExpenses, setFixedExpenses] = useState<{id: string | number, label: string, amount: number}[]>([]);
  const [staffSalaries, setStaffSalaries] = useState<{id: string | number, name: string, baseSalary: number}[]>([]);
  const [isSavingSummary, setIsSavingSummary] = useState(false);

  const addFixedExpense = () => setFixedExpenses([...fixedExpenses, { id: Date.now(), label: '', amount: 0 }]);
  const updateFixedExpense = (id: string | number, field: string, val: any) => setFixedExpenses(fixedExpenses.map(e => e.id === id ? { ...e, [field]: val } : e));
  const removeFixedExpense = (id: string | number) => setFixedExpenses(fixedExpenses.filter(e => e.id !== id));

  const addStaff = () => setStaffSalaries([...staffSalaries, { id: Date.now(), name: '', baseSalary: 0 }]);
  const updateStaff = (id: string | number, field: string, val: any) => setStaffSalaries(staffSalaries.map(s => s.id === id ? { ...s, [field]: val } : s));
  const removeStaff = (id: string | number) => setStaffSalaries(staffSalaries.filter(s => s.id !== id));

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const timestamp = Date.now();
      const fetchOptions = {
        cache: 'no-store' as RequestCache,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      };

      const [closuresRes, attemptsRes, supplyRes, summaryRes] = await Promise.all([
        fetch(`/api/closure/list?month=${selectedMonth}&_t=${timestamp}`, fetchOptions).catch(() => null),
        fetch(`/api/dashboard/attempts?month=${selectedMonth}&_t=${timestamp}`, fetchOptions).catch(() => null),
        fetch(`/api/supply?month=${selectedMonth}&_t=${timestamp}`, fetchOptions).catch(() => null),
        fetch(`/api/dashboard/summary?month=${selectedMonth}&_t=${timestamp}`, fetchOptions).catch(() => null)
      ]);
      
      const errors: string[] = [];

      if (closuresRes && closuresRes.ok) {
        const cData = await closuresRes.json();
        setClosures(cData.closures || cData || []);
      } else errors.push('Clôtures');

      if (attemptsRes && attemptsRes.ok) {
        const attData = await attemptsRes.json();
        setAttempts(attData.attempts || attData || []);
      } else errors.push('Tentatives');

      if (supplyRes && supplyRes.ok) {
        const sData = await supplyRes.json();
        setSupplies(sData.supplies || sData || []);
      } else errors.push('Achats');

      if (summaryRes && summaryRes.ok) {
        const sumData = await summaryRes.json();
        setFixedExpenses(sumData.expenses.map((e: any) => ({ id: e.id, label: e.label, amount: e.amount })));
        setStaffSalaries(sumData.salaries.map((s: any) => ({ id: s.id, name: s.name, baseSalary: s.base_salary })));
      } else {
        setFixedExpenses([]);
        setStaffSalaries([]);
      }

      if (errors.length > 0) setFetchError(`Échec de récupération : ${errors.join(', ')}`);
    } catch (err) {
      setFetchError('Erreur inattendue lors de la récupération des données.');
    } finally {
      setLoading(false);
    }
  };

  const saveMonthlySummary = async () => {
    setIsSavingSummary(true);
    try {
      const res = await fetch('/api/dashboard/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          expenses: fixedExpenses,
          salaries: staffSalaries
        })
      });
      if (!res.ok) throw new Error('Échec de la sauvegarde');
      alert('Bilan mensuel sauvegardé avec succès !');
    } catch (err) {
      alert('Erreur lors de la sauvegarde du bilan.');
    } finally {
      setIsSavingSummary(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/');
  };

  const filteredClosures = closures.filter((c) => {
    const bDate = String(c.business_date || c.businessDate || c.date || '');
    if (!selectedMonth) return true;
    return bDate.includes(selectedMonth);
  }).sort((a, b) => {
    const d1 = new Date(a.business_date || a.businessDate || a.date || 0).getTime();
    const d2 = new Date(b.business_date || b.businessDate || b.date || 0).getTime();
    return d1 - d2;
  });

  const totalRevenue = filteredClosures.reduce((sum, c) => sum + (Number(c.gross_revenue ?? c.grossRevenue ?? c.total_revenue ?? c.totalRevenue) || 0), 0);
  const totalExpenses = filteredClosures.reduce((sum, c) => sum + (Number(c.total_expenses ?? c.totalExpenses) || 0), 0);
  const totalNetCash = filteredClosures.reduce((sum, c) => sum + (Number(c.net_cash ?? c.netCash) || 0), 0);

  const daysCount = filteredClosures.length || 1;
  const avgDailyRevenue = totalRevenue / daysCount;
  const avgDailyExpenses = totalExpenses / daysCount;
  const expenseRatio = totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : '0';

  const maxDay = filteredClosures.reduce((max, c) => {
    const rev = Number(c.gross_revenue ?? c.grossRevenue ?? c.total_revenue ?? c.totalRevenue) || 0;
    const maxRev = Number(max?.gross_revenue ?? max?.grossRevenue ?? max?.total_revenue ?? max?.totalRevenue) || 0;
    return rev > maxRev ? c : max;
  }, null);

  const minDay = filteredClosures.reduce((min, c) => {
    const rev = Number(c.gross_revenue ?? c.grossRevenue ?? c.total_revenue ?? c.totalRevenue) || 0;
    const minRev = Number(min?.gross_revenue ?? min?.grossRevenue ?? min?.total_revenue ?? min?.totalRevenue) || Infinity;
    return rev < minRev ? c : min;
  }, null);

  const staffAdvancesMap: { [key: string]: number } = {};
  filteredClosures.forEach((c) => {
    const advances = c.staffAdvances || c.staff_advances || [];
    advances.forEach((adv: any) => {
      const name = adv.employee_name || adv.employeeName;
      if (name) {
        staffAdvancesMap[name] = (staffAdvancesMap[name] || 0) + (Number(adv.amount) || 0);
      }
    });
  });

  const chartData = {
    labels: filteredClosures.map((c) => c.business_date || c.businessDate || c.date),
    datasets: [
      { label: 'Recette Brute (MAD)', data: filteredClosures.map((c) => Number(c.gross_revenue ?? c.grossRevenue ?? c.total_revenue ?? c.totalRevenue) || 0), borderColor: 'rgb(22, 163, 74)', backgroundColor: 'rgba(22, 163, 74, 0.1)', fill: true, tension: 0.2 },
      { label: 'Dépenses (MAD)', data: filteredClosures.map((c) => Number(c.total_expenses ?? c.totalExpenses) || 0), borderColor: 'rgb(220, 38, 38)', backgroundColor: 'rgba(220, 38, 38, 0.1)', fill: true, tension: 0.2 },
    ],
  };

  const inventoryVolumes: Record<string, number> = {};
  supplies.forEach(s => {
    (s.items || []).forEach((i: any) => {
      const itemName = i.label || i.code;
      if (itemName) {
        inventoryVolumes[itemName] = (inventoryVolumes[itemName] || 0) + (Number(i.quantity) || 0);
      }
    });
  });

  const inventoryChartData = {
    labels: Object.keys(inventoryVolumes),
    datasets: [
      { label: 'Volume Acheté (Ce Mois)', data: Object.values(inventoryVolumes), backgroundColor: 'rgba(59, 130, 246, 0.8)', borderRadius: 4 }
    ]
  };

  const getStaffAdvance = (name: string) => {
    if (!name) return 0;
    const searchName = name.toLowerCase().trim();
    let totalAdv = 0;
    Object.keys(staffAdvancesMap).forEach(key => {
      if (key.toLowerCase().trim() === searchName) {
        totalAdv += staffAdvancesMap[key];
      }
    });
    return totalAdv;
  };

  const totalFixedExpenses = fixedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalBaseSalaries = staffSalaries.reduce((sum, s) => sum + (Number(s.baseSalary) || 0), 0);
  const totalOverallExpenses = totalExpenses + totalFixedExpenses + totalBaseSalaries;
  const monthlyNetProfit = totalRevenue - totalOverallExpenses;
  const monthlyExpenseRatio = totalRevenue > 0 ? ((totalOverallExpenses / totalRevenue) * 100).toFixed(1) : '0';

  const selectedClosureDate = selectedClosure ? (selectedClosure.business_date || selectedClosure.businessDate || selectedClosure.date) : null;
  const selectedClosureAttempts = selectedClosureDate
    ? attempts.filter(a => String(a.closure_date || '').includes(selectedClosureDate))
    : [];

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-8 text-gray-800 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord — Naclos Admin</h1>
          <p className="text-xs text-gray-500">Suivi financier, analyses mensuelles et audits de clôture</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-50 p-2 border rounded-xl">
            <label className="text-xs font-bold text-gray-600">Mois :</label>
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-sm font-bold outline-none cursor-pointer" />
          </div>
          <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-500 transition">Rafraîchir</button>
          <button onClick={handleLogout} className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition">Déconnexion</button>
        </div>
      </div>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm font-semibold px-4 py-3 rounded-xl">
          ⚠️ {fetchError}
          <button onClick={fetchData} className="ml-3 underline font-bold">Réessayer</button>
        </div>
      )}

      {loading ? (
        <div className="text-center text-sm text-gray-400 py-6">Chargement des données…</div>
      ) : (
      <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-1">
          <span className="text-xs text-gray-400 font-bold uppercase">Total Net Cash (Mois)</span>
          <div className="text-2xl font-extrabold text-green-700 font-mono">{totalNetCash.toLocaleString()} MAD</div>
          <p className="text-xs text-gray-500">Recettes - Dépenses - Avances</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-1">
          <span className="text-xs text-gray-400 font-bold uppercase">Moyenne / Jour</span>
          <div className="text-2xl font-extrabold text-gray-900 font-mono">{avgDailyRevenue.toFixed(0)} MAD</div>
          <p className="text-xs text-gray-500">Moy. Dépenses: {avgDailyExpenses.toFixed(0)} MAD</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-1">
          <span className="text-xs text-gray-400 font-bold uppercase">Ratio Dépenses (Quotidien)</span>
          <div className="text-2xl font-extrabold text-red-600 font-mono">{expenseRatio}%</div>
          <p className="text-xs text-gray-500">Total Dépenses: {totalExpenses.toLocaleString()} MAD</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-1">
          <span className="text-xs text-gray-400 font-bold uppercase">Extrêmes du Mois</span>
          <div className="text-xs font-bold text-gray-800 space-y-0.5">
            <div>📈 Max: {maxDay ? `${Number(maxDay.gross_revenue ?? maxDay.grossRevenue ?? maxDay.total_revenue ?? maxDay.totalRevenue).toLocaleString()} MAD` : '-'}</div>
            <div>📉 Min: {minDay ? `${Number(minDay.gross_revenue ?? minDay.grossRevenue ?? minDay.total_revenue ?? minDay.totalRevenue).toLocaleString()} MAD` : '-'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Évolution des Recettes et Dépenses</h3>
          {filteredClosures.length > 0 ? (
            <div className="h-[450px]"><Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">Aucune donnée disponible.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Volume des Achats (Marchandise Salem)</h3>
          {Object.keys(inventoryVolumes).length > 0 ? (
            <div className="h-[450px]">
               <Bar data={inventoryChartData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} />
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">Aucun achat enregistré ce mois par Salem.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Clôtures Journalières ({filteredClosures.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-400 uppercase">
                  <th className="pb-3">Date Prévue</th>
                  <th className="pb-3">Heure d'envoi</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3 text-right">Recette Brute</th>
                  <th className="pb-3 text-right">Cash Net</th>
                  <th className="pb-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredClosures.map((c) => {
                  const bDate = c.business_date || c.businessDate || c.date;
                  const dayAttempts = attempts.filter(a => String(a.closure_date || '').includes(bDate));
                  const realTime = new Date(c.submitted_at || c.created_at || new Date()).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
                  const grossRev = Number(c.gross_revenue ?? c.grossRevenue ?? c.total_revenue ?? c.totalRevenue) || 0;
                  const netCsh = Number(c.net_cash ?? c.netCash) || 0;

                  return (
                    <tr key={c.id || bDate} className="hover:bg-gray-50">
                      <td className="py-3 font-bold">{bDate}</td>
                      <td className="py-3 text-xs text-blue-600 font-mono">{realTime}</td>
                      <td className="py-3">
                        {dayAttempts.length > 0 ? (
                          <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold border border-amber-200">
                            ⚠️ Modifiée ({dayAttempts.length} version(s))
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs">Standard</span>
                        )}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-green-700">{grossRev.toLocaleString()} MAD</td>
                      <td className="py-3 text-right font-mono font-bold">{netCsh.toLocaleString()} MAD</td>
                      <td className="py-3 text-center">
                        <button onClick={() => setSelectedClosure(c)} className="px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800">Voir Détails</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Avances (Personnel)</h3>
          <div className="space-y-3">
            {Object.keys(staffAdvancesMap).length > 0 ? (
              Object.entries(staffAdvancesMap).map(([name, totalAmt]) => (
                <div key={name} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border">
                  <span className="font-bold text-sm text-gray-800">{name}</span>
                  <span className="font-mono font-extrabold text-amber-600">{totalAmt.toLocaleString()} MAD</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 italic text-center py-6">Aucune avance enregistrée ce mois.</p>
            )}
          </div>
        </div>
      </div>

      {/* ========================================= */}
      {/* REDESIGNED SECTION: MONTHLY SUMMARY & PAYROLL */}
      {/* ========================================= */}
      <div className="mt-12 border-t-2 border-gray-200 pt-10 space-y-8">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Clôture et Bilan Mensuel</h2>
          <p className="text-sm text-gray-500">Gérez votre personnel, vos charges fixes et consultez la santé financière globale du mois.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Calculators (Takes 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Staff Salary Calculator */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-900">Calcul des Salaires & Avances</h3>
                <button onClick={addStaff} className="text-xs bg-blue-50 text-blue-600 font-bold px-3 py-2 rounded-xl hover:bg-blue-100 transition">+ Ajouter Personnel</button>
              </div>
              {staffSalaries.length === 0 && <p className="text-xs text-gray-400 italic">Ajoutez votre personnel pour calculer les salaires nets après déduction des avances.</p>}
              
              <div className="space-y-3">
                {staffSalaries.map(staff => {
                  const adv = getStaffAdvance(staff.name);
                  const net = (Number(staff.baseSalary) || 0) - adv;
                  return (
                    <div key={staff.id} className="p-4 bg-gray-50 rounded-xl border space-y-3">
                      <div className="flex gap-3 items-center">
                        <input type="text" placeholder="Nom complet" value={staff.name} onChange={e => updateStaff(staff.id, 'name', e.target.value)} className="flex-1 p-2.5 bg-white border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-black" />
                        <input type="number" placeholder="Salaire base (MAD)" value={staff.baseSalary === 0 ? '' : staff.baseSalary} onChange={e => updateStaff(staff.id, 'baseSalary', e.target.value)} className="w-36 p-2.5 bg-white border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-black" />
                        <button onClick={() => removeStaff(staff.id)} className="text-red-500 hover:bg-red-100 p-2.5 rounded-xl font-bold transition">✕</button>
                      </div>
                      {staff.name && (
                        <div className="flex justify-between items-center text-xs px-3 py-2 bg-white rounded-xl border">
                          <span className="text-gray-500">Avances prises: <span className="font-bold text-red-500">-{adv} MAD</span></span>
                          <span className="font-bold text-gray-900">Reste à payer: <span className={net < 0 ? 'text-red-600 font-extrabold' : 'text-green-600 font-extrabold'}>{net} MAD</span></span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Fixed Expenses Tracker */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-900">Dépenses Fixes (Loyer, Électricité...)</h3>
                <button onClick={addFixedExpense} className="text-xs bg-blue-50 text-blue-600 font-bold px-3 py-2 rounded-xl hover:bg-blue-100 transition">+ Ajouter Charge</button>
              </div>
              {fixedExpenses.length === 0 && <p className="text-xs text-gray-400 italic">Ajoutez les charges fixes du mois pour le bilan final.</p>}
              
              <div className="space-y-3">
                {fixedExpenses.map(exp => (
                  <div key={exp.id} className="flex gap-3 items-center">
                    <input type="text" placeholder="Description de la charge" value={exp.label} onChange={e => updateFixedExpense(exp.id, 'label', e.target.value)} className="flex-1 p-2.5 bg-white border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-black" />
                    <input type="number" placeholder="Montant (MAD)" value={exp.amount === 0 ? '' : exp.amount} onChange={e => updateFixedExpense(exp.id, 'amount', e.target.value)} className="w-36 p-2.5 bg-white border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-black" />
                    <button onClick={() => removeFixedExpense(exp.id)} className="text-red-500 hover:bg-red-100 p-2.5 rounded-xl font-bold transition">✕</button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Premium Global Summary Card (Takes 5 cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-gray-900 to-slate-900 p-8 rounded-3xl shadow-2xl text-white border border-gray-800 flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                <h3 className="text-xl font-extrabold text-blue-400 tracking-wide">Bilan Global Mensuel</h3>
                <span className="text-xs font-mono bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">{selectedMonth}</span>
              </div>
              
              <div className="flex justify-between items-center bg-white/5 p-3.5 rounded-2xl border border-white/5">
                <span className="text-gray-300 text-sm font-medium">Recette Mensuelle (Brute)</span>
                <span className="font-mono text-base font-bold text-emerald-400">+{totalRevenue.toLocaleString()} MAD</span>
              </div>
              
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-sm px-1">
                  <span className="text-gray-400">Achats & Dépenses Journalières</span>
                  <span className="font-mono font-semibold text-rose-400">-{totalExpenses.toLocaleString()} MAD</span>
                </div>
                <div className="flex justify-between items-center text-sm px-1">
                  <span className="text-gray-400">Masse Salariale (Base)</span>
                  <span className="font-mono font-semibold text-rose-400">-{totalBaseSalaries.toLocaleString()} MAD</span>
                </div>
                <div className="flex justify-between items-center text-sm px-1">
                  <span className="text-gray-400">Dépenses Fixes Mensuelles</span>
                  <span className="font-mono font-semibold text-rose-400">-{totalFixedExpenses.toLocaleString()} MAD</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-800 px-1">
                <span className="text-gray-300 text-sm font-bold">Total des Charges Globales</span>
                <span className="font-mono text-base font-extrabold text-rose-500">-{totalOverallExpenses.toLocaleString()} MAD</span>
              </div>
              
              <div className="flex justify-between items-center bg-black/40 p-3.5 rounded-2xl border border-white/5">
                <span className="text-gray-400 text-sm">Ratio Global Dépenses / Recette</span>
                <span className="font-mono font-bold text-amber-400 text-base">{monthlyExpenseRatio}%</span>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-800">
              <div className="bg-black/60 p-6 rounded-2xl border border-blue-500/30 text-center shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/5 pointer-events-none"></div>
                <span className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Bénéfice Net Mensuel Réel</span>
                <span className={`text-4xl font-black font-mono tracking-tight ${monthlyNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {monthlyNetProfit > 0 ? '+' : ''}{monthlyNetProfit.toLocaleString()} MAD
                </span>
              </div>

              <button 
                onClick={saveMonthlySummary}
                disabled={isSavingSummary}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 disabled:opacity-50 text-sm tracking-wide"
              >
                {isSavingSummary ? 'Sauvegarde en cours...' : '💾 Sauvegarder le Bilan Mensuel'}
              </button>
            </div>
          </div>

        </div>
      </div>
      {/* ========================================= */}
      </>
      )}

      {selectedClosure && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Détails de Clôture — {selectedClosureDate}</h2>
              </div>
              <button onClick={() => setSelectedClosure(null)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full font-bold text-gray-600">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl text-center font-mono">
              <div><span className="text-[10px] text-gray-400 uppercase block">Recette</span><span className="text-base font-bold text-green-700">{Number(selectedClosure.gross_revenue ?? selectedClosure.grossRevenue ?? selectedClosure.total_revenue ?? selectedClosure.totalRevenue).toLocaleString()} MAD</span></div>
              <div><span className="text-[10px] text-gray-400 uppercase block">Dépenses</span><span className="text-base font-bold text-red-600">{Number(selectedClosure.total_expenses ?? selectedClosure.totalExpenses).toLocaleString()} MAD</span></div>
              <div><span className="text-[10px] text-gray-400 uppercase block">Cash Net</span><span className="text-base font-bold text-gray-900">{Number(selectedClosure.net_cash ?? selectedClosure.netCash).toLocaleString()} MAD</span></div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Dépenses du Jour</h4>
              {(selectedClosure.expenses || []).length > 0 ? (
                <div className="space-y-1">
                  {selectedClosure.expenses.map((e: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs p-2 bg-gray-50 rounded border">
                      <span>{e.label}</span>
                      <span className="font-mono font-bold text-red-600">{e.amount} MAD</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Aucune dépense.</p>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Avances du Personnel</h4>
              {(selectedClosure.staffAdvances || selectedClosure.staff_advances || []).length > 0 ? (
                <div className="space-y-1">
                  {(selectedClosure.staffAdvances || selectedClosure.staff_advances).map((a: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs p-2 bg-gray-50 rounded border">
                      <span>{a.employeeName || a.employee_name}</span>
                      <span className="font-mono font-bold text-amber-600">{a.amount} MAD</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Aucune avance.</p>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">État du Stock Réel</h4>
              {(selectedClosure.inventory_logs || selectedClosure.inventory || []).length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(selectedClosure.inventory_logs || selectedClosure.inventory).map((i: any, idx: number) => {
                    const code = i.raw_materials?.code || i.materialCode || '';
                    const fallbackLabels: Record<string, string> = {
                      'dinde': 'Dinde', 'vh': 'Viande Hachée', 'crispy': 'Crispy', 'mozarella': 'Mozzarella',
                      'tortilla': 'Tortilla', 'burger': 'Pain Burger', 'soda': 'Soda', 'eau_p': 'Eau (P)', 'eau_g': 'Eau (G)',
                      'fruit_de_mer': 'Fruits de Mer'
                    };
                    const label = i.materialLabel || fallbackLabels[code] || code || 'Article';

                    return (
                      <div key={idx} className="p-2 bg-gray-50 rounded border text-xs">
                        <span className="block font-semibold text-gray-600">{label}</span>
                        <span className="font-mono font-bold text-gray-900">{i.physical_closing_count ?? i.physicalClosingCount}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">⚠️ Aucun stock enregistré en base de données.</p>
              )}
            </div>

            {(selectedClosure.notes || selectedClosure.discrepancy_summary) && (
              <div>
                <h4 className="text-xs font-bold uppercase text-gray-400 mb-1">Notes Actuelles</h4>
                <p className="text-xs bg-yellow-50 text-yellow-900 p-3 rounded border border-yellow-200 italic">"{selectedClosure.notes || selectedClosure.discrepancy_summary}"</p>
              </div>
            )}

            {(selectedClosure.receiptImageUrl || selectedClosure.receipt_image_url) && (
              <div>
                <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Justificatif / Reçu Caisse</h4>
                <div className="border rounded-xl p-2 text-center bg-gray-50">
                  <img src={selectedClosure.receiptImageUrl || selectedClosure.receipt_image_url} alt="Reçu" className="max-h-60 mx-auto rounded-lg border" />
                  <a href={selectedClosure.receiptImageUrl || selectedClosure.receipt_image_url} target="_blank" className="text-xs text-blue-600 hover:underline mt-2 inline-block font-bold">Ouvrir en plein écran ↗</a>
                </div>
              </div>
            )}

            {selectedClosureAttempts.length > 0 && (
              <div className="mt-8 border-t-2 border-red-100 pt-6">
                <h3 className="text-lg font-bold text-red-600 mb-4">⚠️ Historique des Soumissions (Tentatives du jour)</h3>
                <div className="space-y-4">
                  {selectedClosureAttempts.map((attempt, idx) => {
                    const data = attempt.attempted_data || attempt;
                    const expTotal = (data.expenses || []).reduce((sum: number, e:any) => sum + (Number(e.amount) || 0), 0);
                    return (
                      <div key={idx} className="bg-red-50 p-4 rounded-xl border border-red-200 text-sm">
                        <div className="flex justify-between border-b border-red-200 pb-2 mb-2">
                          <span className="font-bold text-red-800">Tentative #{idx + 1}</span>
                          <span className="text-xs text-red-600">{new Date(attempt.attempted_at || new Date()).toLocaleTimeString()}</span>
                        </div>
                        <ul className="space-y-1 text-red-900">
                          <li><strong>Recette Brute:</strong> {data.grossRevenue || data.gross_revenue} MAD</li>
                          <li><strong>Dépenses:</strong> {expTotal} MAD</li>
                          {data.notes && <li><strong>Note:</strong> "{data.notes}"</li>}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}