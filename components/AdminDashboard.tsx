'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  Filler 
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AdminDashboard() {
  const router = useRouter();
  const [closures, setClosures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM format
  );
  const [selectedClosure, setSelectedClosure] = useState<any | null>(null);

  useEffect(() => {
    fetchClosures();
  }, []);

  const fetchClosures = async () => {
    try {
      const res = await fetch('/api/dashboard/closures'); // Or your endpoint returning closures with child records
      // Fallback: If you fetch directly from Supabase client or API route
      const supabaseRes = await fetch('/api/closure/list').catch(() => null);
      if (supabaseRes && supabaseRes.ok) {
        const data = await supabaseRes.json();
        setClosures(data.closures || []);
      }
    } catch (err) {
      console.error('Error fetching closures:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/');
  };

  // Filter closures by selected month (YYYY-MM)
  const filteredClosures = closures.filter((c) => {
    const bDate = c.business_date || c.businessDate;
    return bDate && bDate.startsWith(selectedMonth);
  }).sort((a, b) => new Date(a.business_date || a.businessDate).getTime() - new Date(b.business_date || b.businessDate).getTime());

  // Calculations for Monthly KPIs
  const totalRevenue = filteredClosures.reduce((sum, c) => sum + (Number(c.gross_revenue ?? c.grossRevenue) || 0), 0);
  const totalExpenses = filteredClosures.reduce((sum, c) => sum + (Number(c.total_expenses ?? c.totalExpenses) || 0), 0);
  const totalAdvances = filteredClosures.reduce((sum, c) => sum + (Number(c.total_staff_advances ?? c.totalStaffAdvances) || 0), 0);
  const totalNetCash = filteredClosures.reduce((sum, c) => sum + (Number(c.net_cash ?? c.netCash) || 0), 0);
  
  const daysCount = filteredClosures.length || 1;
  const avgDailyRevenue = totalRevenue / daysCount;
  const avgDailyExpenses = totalExpenses / daysCount;
  const avgNetCash = totalNetCash / daysCount;
  const expenseRatio = totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : '0';

  const maxDay = filteredClosures.reduce((max, c) => (Number(c.gross_revenue ?? c.grossRevenue) > Number(max?.gross_revenue ?? max?.grossRevenue || 0) ? c : max), null);
  const minDay = filteredClosures.reduce((min, c) => (Number(c.gross_revenue ?? c.grossRevenue) < Number(min?.gross_revenue ?? min?.grossRevenue || Infinity) ? c : min), null);

  // Aggregate Staff Advances for the Month
  const staffAdvancesMap: { [key: string]: number } = {};
  filteredClosures.forEach((c) => {
    const advances = c.staffAdvances || c.staff_advances || [];
    advances.forEach((adv: any) => {
      const name = adv.employee_name || adv.employeeName;
      const amount = Number(adv.amount) || 0;
      staffAdvancesMap[name] = (staffAdvancesMap[name] || 0) + amount;
    });
  });

  // Chart Data
  const chartData = {
    labels: filteredClosures.map((c) => c.business_date || c.businessDate),
    datasets: [
      {
        label: 'Recette Brute (MAD)',
        data: filteredClosures.map((c) => Number(c.gross_revenue ?? c.grossRevenue) || 0),
        borderColor: 'rgb(22, 163, 74)',
        backgroundColor: 'rgba(22, 163, 74, 0.1)',
        fill: true,
        tension: 0.2,
      },
      {
        label: 'Dépenses (MAD)',
        data: filteredClosures.map((c) => Number(c.total_expenses ?? c.totalExpenses) || 0),
        borderColor: 'rgb(220, 38, 38)',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        fill: true,
        tension: 0.2,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-8 text-gray-800 max-w-7xl mx-auto">
      {/* Header & Month Selector */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord — Naclos Admin</h1>
          <p className="text-xs text-gray-500">Suivi financier, analyses mensuelles et audits de clôture</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-50 p-2 border rounded-xl">
            <label className="text-xs font-bold text-gray-600">Mois :</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-bold outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition"
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-1">
          <span className="text-xs text-gray-400 font-bold uppercase">Total Net Cash (Mois)</span>
          <div className="text-2xl font-extrabold text-green-700 font-mono">{totalNetCash.toLocaleString()} MAD</div>
          <p className="text-xs text-gray-500">Recettes - Dépenses - Avances</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-1">
          <span className="text-xs text-gray-400 font-bold uppercase">Moyenne / Jour (Recette)</span>
          <div className="text-2xl font-extrabold text-gray-900 font-mono">{avgDailyRevenue.toFixed(0)} MAD</div>
          <p className="text-xs text-gray-500">Moy. Dépenses: {avgDailyExpenses.toFixed(0)} MAD</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-1">
          <span className="text-xs text-gray-400 font-bold uppercase">Ratio Dépenses / Recette</span>
          <div className="text-2xl font-extrabold text-red-600 font-mono">{expenseRatio}%</div>
          <p className="text-xs text-gray-500">Total Dépenses: {totalExpenses.toLocaleString()} MAD</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-1">
          <span className="text-xs text-gray-400 font-bold uppercase">Extrêmes du Mois</span>
          <div className="text-xs font-bold text-gray-800 space-y-0.5">
            <div>📈 Max: {maxDay ? `${Number(maxDay.gross_revenue ?? maxDay.grossRevenue).toLocaleString()} MAD` : '-'}</div>
            <div>📉 Min: {minDay ? `${Number(minDay.gross_revenue ?? minDay.grossRevenue).toLocaleString()} MAD` : '-'}</div>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Évolution des Recettes et Dépenses (Mois en cours)</h3>
        {filteredClosures.length > 0 ? (
          <div className="h-72">
            <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-12">Aucune donnée disponible pour ce mois.</p>
        )}
      </div>

      {/* Two Columns: Daily List & Staff Salaries/Advances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Daily Closures List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Clôtures Journalières ({filteredClosures.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-400 uppercase">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Responsable</th>
                  <th className="pb-3 text-right">Recette Brute</th>
                  <th className="pb-3 text-right">Cash Net</th>
                  <th className="pb-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredClosures.map((c) => (
                  <tr key={c.id || c.business_date} className="hover:bg-gray-50">
                    <td className="py-3 font-medium">{c.business_date || c.businessDate}</td>
                    <td className="py-3">{c.manager_name || c.managerName}</td>
                    <td className="py-3 text-right font-mono font-bold text-green-700">
                      {Number(c.gross_revenue ?? c.grossRevenue).toLocaleString()} MAD
                    </td>
                    <td className="py-3 text-right font-mono font-bold">
                      {Number(c.net_cash ?? c.netCash).toLocaleString()} MAD
                    </td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() => setSelectedClosure(c)}
                        className="px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800"
                      >
                        Voir Détails
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Staff Salaries & Advances Summary */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Avances & Salaires (Personnel)</h3>
          <p className="text-xs text-gray-500">Cumul des avances sur salaire accordées ce mois-ci pour la paie.</p>
          
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

      {/* DETAIL MODAL FOR SELECTED CLOSURE */}
      {selectedClosure && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Détails de Clôture — {selectedClosure.business_date || selectedClosure.businessDate}</h2>
                <p className="text-xs text-gray-500">Responsable : {selectedClosure.manager_name || selectedClosure.managerName}</p>
              </div>
              <button
                onClick={() => setSelectedClosure(null)}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full font-bold text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl text-center font-mono">
              <div>
                <span className="text-[10px] text-gray-400 uppercase block">Recette Brute</span>
                <span className="text-base font-bold text-green-700">{Number(selectedClosure.gross_revenue ?? selectedClosure.grossRevenue).toLocaleString()} MAD</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase block">Total Dépenses</span>
                <span className="text-base font-bold text-red-600">{Number(selectedClosure.total_expenses ?? selectedClosure.totalExpenses).toLocaleString()} MAD</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase block">Cash Net</span>
                <span className="text-base font-bold text-gray-900">{Number(selectedClosure.net_cash ?? selectedClosure.netCash).toLocaleString()} MAD</span>
              </div>
            </div>

            {/* Expenses List */}
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

            {/* Staff Advances List */}
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

            {/* Stock Counts */}
            <div>
              <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">État du Stock Réel</h4>
              <div className="grid grid-cols-3 gap-2">
                {(selectedClosure.inventory || []).map((i: any, idx: number) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded border text-xs">
                    <span className="block font-semibold text-gray-600">{i.materialLabel || i.raw_materials?.name || 'Article'}</span>
                    <span className="font-mono font-bold text-gray-900">{i.physicalClosingCount ?? i.physical_closing_count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes / Remarques */}
            {(selectedClosure.notes || selectedClosure.discrepancy_summary) && (
              <div>
                <h4 className="text-xs font-bold uppercase text-gray-400 mb-1">Remarques / Notes</h4>
                <p className="text-xs bg-yellow-50 text-yellow-900 p-3 rounded border border-yellow-200 italic">
                  "{selectedClosure.notes || selectedClosure.discrepancy_summary}"
                </p>
              </div>
            )}

            {/* Receipt Image Viewer */}
            {(selectedClosure.receiptImageUrl || selectedClosure.receipt_image_url) && (
              <div>
                <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Justificatif / Reçu Caisse</h4>
                <div className="border rounded-xl p-2 text-center bg-gray-50">
                  <img
                    src={selectedClosure.receiptImageUrl || selectedClosure.receipt_image_url}
                    alt="Reçu"
                    className="max-h-60 mx-auto rounded-lg border"
                  />
                  <a
                    href={selectedClosure.receiptImageUrl || selectedClosure.receipt_image_url}
                    target="_blank"
                    className="text-xs text-blue-600 hover:underline mt-2 inline-block font-bold"
                  >
                    Ouvrir en plein écran ↗
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}