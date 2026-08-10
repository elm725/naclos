'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';

interface ClosureRecord {
  id: string;
  business_date: string;
  manager_name: string;
  gross_revenue: number;
  total_expenses: number;
  total_staff_advances: number;
  net_cash: number;
  net_profit: number;
  receipt_image_url?: string | null;
  has_inventory_discrepancy: boolean;
  discrepancy_summary?: string | null;
  expenses?: Array<{ label: string; amount: number }>;
}

export default function AdminDashboard() {
  const [closures, setClosures] = useState<ClosureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClosure, setSelectedClosure] = useState<ClosureRecord | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const supabase = getSupabaseClient();
        
        const { data, error } = await supabase
          .from('daily_closures')
          .select(`
            *,
            expenses (label, amount)
          `)
          .order('business_date', { ascending: true })
          .limit(30);

        if (error) throw error;
        setClosures(data || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // Compute scale boundaries for Y-Axis
  const netProfits = closures.map((c) => Number(c.net_profit) || 0);
  const rawMax = Math.max(...netProfits, 1000);
  const rawMin = Math.min(...netProfits, 0);

  // Round max value up to clean step interval
  const yMax = Math.ceil(rawMax / 10000) * 10000 || 10000;
  const yMin = rawMin < 0 ? Math.floor(rawMin / 10000) * 10000 : 0;
  const yRange = yMax - yMin;

  // Generate 4 horizontal gridline levels
  const yTicks = [
    yMax,
    yMin + yRange * 0.66,
    yMin + yRange * 0.33,
    yMin,
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-neutral-500">
        Chargement des données du tableau de bord…
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Tableau de Bord Naclos</h1>
          <p className="text-sm text-neutral-500">Analyse du Profit Net & Suivi des Clôtures</p>
        </div>
      </header>

      {/* Structured Chart with Y-Axis and X-Axis */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">Évolution du Profit Net (DH)</h2>
        <p className="mb-6 text-xs text-neutral-400">Cliquez sur une barre pour consulter le détail et le reçu de la journée.</p>

        {closures.length === 0 ? (
          <div className="py-12 text-center text-sm text-neutral-400">Aucune clôture enregistrée.</div>
        ) : (
          <div className="flex gap-4">
            {/* Y-Axis Column */}
            <div className="flex flex-col justify-between pt-6 pb-8 text-right font-mono text-[11px] text-neutral-400 select-none w-20 border-r border-neutral-200 pr-3">
              {yTicks.map((tick, idx) => (
                <span key={idx}>
                  {Math.round(tick).toLocaleString('fr-FR')} DH
                </span>
              ))}
            </div>

            {/* Chart Grid Area */}
            <div className="relative flex-1">
              {/* Horizontal Background Gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between pt-8 pb-8 pointer-events-none">
                <div className="w-full border-b border-dashed border-neutral-200" />
                <div className="w-full border-b border-dashed border-neutral-200" />
                <div className="w-full border-b border-dashed border-neutral-200" />
                <div className="w-full border-b border-neutral-300" />
              </div>

              {/* Bars Row */}
              <div className="relative z-10 flex h-64 items-end gap-4 pt-6 pb-8 px-2 overflow-x-auto">
                {closures.map((c) => {
                  const val = Number(c.net_profit) || 0;
                  const isNegative = val < 0;
                  
                  // Percentage height relative to chart boundaries
                  const heightPercent = Math.max((Math.abs(val) / yRange) * 100, 4);

                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedClosure(c)}
                      className="group relative flex flex-1 flex-col items-center justify-end h-full cursor-pointer min-w-[50px] max-w-[80px]"
                    >
                      {/* Floating Amount Label above Bar */}
                      <span className={`mb-1 font-mono text-[11px] font-bold ${isNegative ? 'text-red-600' : 'text-emerald-700'}`}>
                        {val > 0 ? `+${val.toLocaleString('fr-FR')}` : val.toLocaleString('fr-FR')}
                      </span>

                      {/* Bar Rectangle */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-lg transition-all duration-200 group-hover:scale-105 ${
                          isNegative
                            ? 'bg-red-500 group-hover:bg-red-600'
                            : 'bg-neutral-900 group-hover:bg-black'
                        }`}
                      />

                      {/* X-Axis Date Label */}
                      <span className="absolute -bottom-6 font-mono text-[11px] font-medium text-neutral-600">
                        {c.business_date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Recent Closures Table */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">Dernières Clôtures</h2>
        <div className="divide-y divide-neutral-100">
          {closures.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedClosure(c)}
              className="flex cursor-pointer items-center justify-between py-3 hover:bg-neutral-50 px-2 rounded-lg transition-colors"
            >
              <div>
                <div className="font-semibold text-neutral-900">{c.business_date}</div>
                <div className="text-xs text-neutral-500">Responsable: {c.manager_name}</div>
              </div>
              <div className="text-right">
                <div className={`font-bold ${Number(c.net_profit) < 0 ? 'text-red-600' : 'text-neutral-900'}`}>
                  {Number(c.net_profit).toLocaleString('fr-FR')} DH
                </div>
                <div className="text-xs text-neutral-400">Profit Net</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modal Details with Receipt Image */}
      {selectedClosure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
              <div>
                <h3 className="text-xl font-bold text-neutral-900">Détails du {selectedClosure.business_date}</h3>
                <p className="text-xs text-neutral-500">Responsable: {selectedClosure.manager_name}</p>
              </div>
              <button
                onClick={() => setSelectedClosure(null)}
                className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-bold text-neutral-600 hover:bg-neutral-200"
              >
                ✕ Fermer
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-neutral-100 p-3">
                <div className="text-[10px] text-neutral-500">Revenu Brut</div>
                <div className="text-sm font-bold text-neutral-900">{Number(selectedClosure.gross_revenue).toLocaleString('fr-FR')} DH</div>
              </div>
              <div className="rounded-lg bg-neutral-100 p-3">
                <div className="text-[10px] text-neutral-500">Total Dépenses</div>
                <div className="text-sm font-bold text-neutral-900">{Number(selectedClosure.total_expenses).toLocaleString('fr-FR')} DH</div>
              </div>
              <div className="rounded-lg bg-neutral-100 p-3">
                <div className="text-[10px] text-neutral-500">Avances Staff</div>
                <div className="text-sm font-bold text-neutral-900">{Number(selectedClosure.total_staff_advances).toLocaleString('fr-FR')} DH</div>
              </div>
              <div className="rounded-lg bg-neutral-900 p-3 text-white">
                <div className="text-[10px] text-neutral-300">Cash Net</div>
                <div className="text-sm font-bold">{Number(selectedClosure.net_cash).toLocaleString('fr-FR')} DH</div>
              </div>
            </div>

            {/* Receipt Image Display */}
            <div>
              <h4 className="mb-2 text-sm font-semibold text-neutral-800">Reçu / Feuille de Clôture Photo</h4>
              {selectedClosure.receipt_image_url ? (
                <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                  <a href={selectedClosure.receipt_image_url} target="_blank" rel="noreferrer">
                    <img
                      src={selectedClosure.receipt_image_url}
                      alt={`Reçu du ${selectedClosure.business_date}`}
                      className="max-h-80 w-full object-contain"
                    />
                  </a>
                  <p className="p-2 text-center text-[11px] text-neutral-400">Cliquer pour agrandir dans un nouvel onglet.</p>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-xs text-neutral-400">
                  Aucune photo transmise pour cette clôture.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}