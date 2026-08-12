'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

export default function AdminDashboard() {
  const router = useRouter();
  const [closures, setClosures] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedClosure, setSelectedClosure] = useState<any | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [closuresRes, attemptsRes, supplyRes] = await Promise.all([
        fetch('/api/closure/list').catch(() => null),
        fetch(`/api/dashboard/attempts?month=${selectedMonth}`).catch(() => null),
        fetch(`/api/supply?month=${selectedMonth}`).catch(() => null)
      ]);

      const errors: string[] = [];

      if (closuresRes && closuresRes.ok) {
        const cData = await closuresRes.json();
        setClosures(cData.closures || cData || []);
      } else if (closuresRes) {
        const text = await closuresRes.text().catch(() => '');
        console.error('Closures fetch failed:', closuresRes.status, text);
        errors.push(`Clôtures (${closuresRes.status})`);
      } else {
        errors.push('Clôtures (réseau)');
      }

      if (attemptsRes && attemptsRes.ok) {
        const attData = await attemptsRes.json();
        setAttempts(attData.attempts || attData || []);
      } else if (attemptsRes) {
        const text = await attemptsRes.text().catch(() => '');
        console.error('Attempts fetch failed:', attemptsRes.status, text);
        errors.push(`Tentatives (${attemptsRes.status})`);
      } else {
        errors.push('Tentatives (réseau)');
      }

      if (supplyRes && supplyRes.ok) {
        const sData = await supplyRes.json();
        setSupplies(sData.supplies || sData || []);
      } else if (supplyRes) {
        const text = await supplyRes.text().catch(() => '');
        console.error('Supply fetch failed:', supplyRes.status, text);
        errors.push(`Achats (${supplyRes.status})`);
      } else {
        errors.push('Achats (réseau)');
      }

      if (errors.length > 0) {
        setFetchError(`Échec de récupération : ${errors.join(', ')}`);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setFetchError('Erreur inattendue lors de la récupération des données.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/');
  };

  const filteredClosures = closures.filter((c) => {
    const bDate = c.business_date || c.businessDate;
    return bDate && bDate.startsWith(selectedMonth);
  }).sort((a, b) => new Date(a.business_date || a.businessDate || 0).getTime() - new Date(b.business_date || b.businessDate || 0).getTime());

  const totalRevenue = filteredClosures.reduce((sum, c) => sum + (Number(c.gross_revenue ?? c.grossRevenue) || 0), 0);
  const totalExpenses = filteredClosures.reduce((sum, c) => sum + (Number(c.total_expenses ?? c.totalExpenses) || 0), 0);
  const totalNetCash = filteredClosures.reduce((sum, c) => sum + (Number(c.net_cash ?? c.netCash) || 0), 0);

  const daysCount = filteredClosures.length || 1;
  const avgDailyRevenue = totalRevenue / daysCount;
  const avgDailyExpenses = totalExpenses / daysCount;
  const expenseRatio = totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : '0';

  const maxDay = filteredClosures.reduce((max, c) => (Number(c.gross_revenue ?? c.grossRevenue) > Number((max?.gross_revenue ?? max?.grossRevenue) || 0) ? c : max), null);
  const minDay = filteredClosures.reduce((min, c) => (Number(c.gross_revenue ?? c.grossRevenue) < Number((min?.gross_revenue ?? min?.grossRevenue) || Infinity) ? c : min), null);

  const staffAdvancesMap: { [key: string]: number } = {};
  filteredClosures.forEach((c) => {
    const advances = c.staffAdvances || c.staff_advances || [];
    advances.forEach((adv: any) => {
      const name = adv.employee_name || adv.employeeName;
      staffAdvancesMap[name] = (staffAdvancesMap[name] || 0) + (Number(adv.amount) || 0);
    });
  });

  const chartData = {
    labels: filteredClosures.map((c) => c.business_date || c.businessDate),
    datasets: [
      { label: 'Recette Brute (MAD)', data: filteredClosures.map((c) => Number(c.gross_revenue ?? c.grossRevenue) || 0), borderColor: 'rgb(22, 163, 74)', backgroundColor: 'rgba(22, 163, 74, 0.1)', fill: true, tension: 0.2 },
      { label: 'Dépenses (MAD)', data: filteredClosures.map((c) => Number(c.total_expenses ?? c.totalExpenses) || 0), borderColor: 'rgb(220, 38, 38)', backgroundColor: 'rgba(220, 38, 38, 0.1)', fill: true, tension: 0.2 },
    ],
  };

  // NOTE: supplies are already scoped to `selectedMonth` server-side (see /api/supply GET),
  // so we don't need to re-filter by date here — we just aggregate quantities by item.
  const inventoryVolumes: Record<string, number> = {};
  supplies.forEach(s => {
    (s.items || []).forEach((i: any) => {
      const itemName = i.label || i.code;
      inventoryVolumes[itemName] = (inventoryVolumes[itemName] || 0) + (Number(i.quantity) || 0);
    });
  });

  const inventoryChartData = {
    labels: Object.keys(inventoryVolumes),
    datasets: [
      {
        label: 'Volume Acheté (Ce Mois)',
        data: Object.values(inventoryVolumes),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 4,
      }
    ]
  };

  const selectedClosureDate = selectedClosure ? (selectedClosure.business_date || selectedClosure.businessDate) : null;
  const selectedClosureAttempts = selectedClosureDate
    ? attempts.filter(a => (a.closure_date || '').startsWith(selectedClosureDate))
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
          <button onClick={handleLogout} className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition">Déconnexion</button>
        </div>
      </div>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm font-semibold px-4 py-3 rounded-xl">
          ⚠️ {fetchError} — vérifiez la console pour plus de détails, ou réessayez.
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
               <Bar
                 data={inventoryChartData}
                 options={{
                   responsive: true,
                   maintainAspectRatio: false,
                   scales: { y: { beginAtZero: true } }
                 }}
               />
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
                  <th className="pb-3">Heure d'envoi (Réelle)</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3 text-right">Recette Brute</th>
                  <th className="pb-3 text-right">Cash Net</th>
                  <th className="pb-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredClosures.map((c) => {
                  const bDate = c.business_date || c.businessDate;
                  const dayAttempts = attempts.filter(a => (a.closure_date || '').startsWith(bDate));
                  const realTime = new Date(c.submitted_at || c.created_at || new Date()).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

                  return (
                    <tr key={c.id || bDate} className="hover:bg-gray-50">
                      <td className="py-3 font-bold">{bDate}</td>
                      <td className="py-3 text-xs text-blue-600 font-mono">{realTime}</td>
                      <td className="py-3">
                        {dayAttempts.length > 1 ? (
                          <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold border border-amber-200">
                            ⚠️ Modifiée ({dayAttempts.length} essais)
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs">Standard</span>
                        )}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-green-700">{Number(c.gross_revenue ?? c.grossRevenue).toLocaleString()} MAD</td>
                      <td className="py-3 text-right font-mono font-bold">{Number(c.net_cash ?? c.netCash).toLocaleString()} MAD</td>
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
          <h3 className="text-lg font-bold text-gray-900">Avances & Salaires (Personnel)</h3>
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

      <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Achats Marchandise (Salem)</h3>
        {supplies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-400 uppercase">
                  <th className="pb-3">Date d'achat</th>
                  <th className="pb-3">Heure de saisie (Réelle)</th>
                  <th className="pb-3">Articles achetés</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {supplies.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-3 font-bold">{s.business_date || s.businessDate}</td>
                    <td className="py-3 text-xs text-blue-600 font-mono">{new Date(s.submitted_at || s.created_at || new Date()).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short'})}</td>
                    <td className="py-3 text-xs">
                      {(s.items || []).map((i: any, idx: number) => (
                        <span key={idx} className="inline-block bg-gray-100 rounded px-2 py-1 mr-2 mb-1 border font-medium">
                          {i.label || i.code}: <strong className="text-gray-900">{i.quantity} {i.unit}</strong>
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">Aucun achat enregistré ce mois-ci par Salem.</p>
        )}
      </div>
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
              <div><span className="text-[10px] text-gray-400 uppercase block">Recette</span><span className="text-base font-bold text-green-700">{Number(selectedClosure.gross_revenue ?? selectedClosure.grossRevenue).toLocaleString()} MAD</span></div>
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
                      'tortilla': 'Tortilla', 'burger': 'Pain Burger', 'soda': 'Soda', 'eau_p': 'Eau (P)', 'eau_g': 'Eau (G)'
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
                          <span className="text-xs text-red-600">{new Date(attempt.created_at || attempt.submitted_at || new Date()).toLocaleTimeString()}</span>
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