// ==========================================
// FILE: components/AdminDashboard.tsx
// ==========================================

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// =====================================================================
// ICONS
// =====================================================================
const IconReceipt = ({ className = '', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
    <path d="M6 3h12v17.5l-2.25-1.5-2.25 1.5-2.25-1.5L9 20.5 6.75 19 4.5 20.5V6a3 3 0 0 1 3-3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconBox = ({ className = '', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
    <path d="M3.5 8 12 3.5 20.5 8 12 12.5 3.5 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M3.5 8v8L12 20.5m0 0 8.5-4.5V8M12 20.5V12.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);
const IconPie = ({ className = '', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
    <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12V3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M15.5 3.9A8.5 8.5 0 0 1 20.1 8.5H15.5V3.9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);
const IconUsers = ({ className = '', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
    <circle cx="9" cy="8.5" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M3.75 19c.6-3 2.6-4.7 5.25-4.7s4.65 1.7 5.25 4.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="16.5" cy="8.8" r="2.3" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M15 14.6c2.2.1 3.85 1.6 4.35 4.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconHandshake = ({ className = '', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
    <path d="M2.5 11.5 6 8l3 2.2 2.2-2.2c.7-.7 1.9-.7 2.6 0l.9.9-4.4 4.4a1.6 1.6 0 0 1-2.2 0L6 11.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    <path d="M14.7 8.9 18 8l3.5 3.5-3.4 3.4a1.7 1.7 0 0 1-2.4 0l-2.6-2.6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    <path d="M8.4 13.9 10.2 15.7a1.6 1.6 0 0 0 2.3 0l.35-.35M11.2 16.9l.9.9a1.5 1.5 0 0 0 2.1 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconRefresh = ({ className = '', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
    <path d="M4 12a8 8 0 0 1 13.6-5.7M20 12a8 8 0 0 1-13.6 5.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M17.2 3.8v3.1h-3.1M6.8 20.2v-3.1h3.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconLogout = ({ className = '', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
    <path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9.5 12H21m0 0-3-3m3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconScale = ({ className = '', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} style={style}>
    <path d="M12 3v18M7 7l-3.5 7a3.5 3.5 0 0 0 7 0L7 7Zm10 0-3.5 7a3.5 3.5 0 0 0 7 0L17 7ZM4 20h16M6 6l6-2 6 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BG = '#0B0C0E';
const SURFACE = '#131417';
const SURFACE_2 = '#191B1F';
const HAIRLINE = 'rgba(255,255,255,0.07)';
const HAIRLINE_STRONG = 'rgba(255,255,255,0.12)';
const TEXT_PRIMARY = '#E4E2DD';
const TEXT_MUTED = '#8B8D93';
const TEXT_FAINT = '#5B5D63';

type TabId = 'closures' | 'supplies' | 'summary' | 'salaries' | 'partnership' | 'consumption';
type AccentKey = 'sage' | 'slate' | 'plum' | 'gold' | 'clay';

const TABS: { id: TabId; label: string; icon: React.FC<{ className?: string; style?: React.CSSProperties }>; accent: AccentKey }[] = [
  { id: 'closures', label: 'Clôtures du Jour', icon: IconReceipt, accent: 'sage' },
  { id: 'supplies', label: 'Achats & Stock', icon: IconBox, accent: 'slate' },
  { id: 'summary', label: 'Bilan Mensuel', icon: IconPie, accent: 'plum' },
  { id: 'salaries', label: 'Salaires & Avances', icon: IconUsers, accent: 'gold' },
  { id: 'partnership', label: 'Partage des Parts', icon: IconHandshake, accent: 'clay' },
  { id: 'consumption', label: 'Consommation', icon: IconScale, accent: 'slate' },
];

const ACCENT: Record<AccentKey, { hex: string; soft: string; text: string }> = {
  sage:  { hex: '#7FA98A', soft: 'rgba(127,169,138,0.12)', text: 'text-[#8FB89A]' },
  slate: { hex: '#6F93AC', soft: 'rgba(111,147,172,0.12)', text: 'text-[#82A4BB]' },
  plum:  { hex: '#8E80A8', soft: 'rgba(142,128,168,0.12)', text: 'text-[#A296BB]' },
  gold:  { hex: '#B99A66', soft: 'rgba(185,154,102,0.12)', text: 'text-[#C4A97C]' },
  clay:  { hex: '#B1806F', soft: 'rgba(177,128,111,0.12)', text: 'text-[#BE9384]' },
};

const POS = '#7FA98A';
const NEG = '#B1806F';

const CONSUMPTION_ITEMS: { code: string; label: string; theoreticalField: string; match: string[] }[] = [
  { code: 'dinde', label: 'Dinde', theoreticalField: 'theoretical_dinde_kg', match: ['dinde'] },
  { code: 'vh', label: 'VH', theoreticalField: 'theoretical_vh_kg', match: ['vh', 'viande hachée'] },
  { code: 'mozzarella', label: 'Mozzarella', theoreticalField: 'theoretical_mozzarella_kg', match: ['mozzarella', 'mozarella'] },
  { code: 'crispy', label: 'Crispy', theoreticalField: 'theoretical_crispy_pcs', match: ['crispy'] },
  { code: 'tortilla', label: 'Tortillas', theoreticalField: 'theoretical_tortillas_pcs', match: ['tortilla'] },
  { code: 'burger', label: 'Buns', theoreticalField: 'theoretical_buns_pcs', match: ['burger'] },
];
const VARIANCE_FLAG_RATIO = 0.1;

function SectionEyebrow({ accent, children }: { accent: AccentKey; children: React.ReactNode }) {
  const a = ACCENT[accent];
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: a.hex }} />
      <span className={`text-[11px] font-bold uppercase tracking-[0.14em] ${a.text}`}>{children}</span>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-6 ${className}`} style={{ background: SURFACE, border: `1px solid ${HAIRLINE}` }}>
      {children}
    </div>
  );
}

const chartTextColor = TEXT_MUTED;
const chartGridColor = 'rgba(255,255,255,0.05)';

export default function AdminDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const authRole = sessionStorage.getItem('naclos_role');
    const isAuth = sessionStorage.getItem('naclos_authenticated');
    if (isAuth !== 'true' || authRole !== 'admin') {
      router.push('/');
    }
  }, [router]);

  const [activeTab, setActiveTab] = useState<TabId>('closures');

  const [closures, setClosures] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [consumptionRecords, setConsumptionRecords] = useState<any[]>([]);
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
  const [fixedExpenses, setFixedExpenses] = useState<{ id: string | number, label: string, amount: number }[]>([]);
  const [staffSalaries, setStaffSalaries] = useState<{ id: string | number, name: string, baseSalary: number }[]>([]);
  const [isSavingSummary, setIsSavingSummary] = useState(false);

  const addFixedExpense = () => setFixedExpenses([...fixedExpenses, { id: Date.now(), label: '', amount: 0 }]);
  const updateFixedExpense = (id: string | number, field: string, val: any) => setFixedExpenses(fixedExpenses.map(e => e.id === id ? { ...e, [field]: val } : e));
  const removeFixedExpense = (id: string | number) => setFixedExpenses(fixedExpenses.filter(e => e.id !== id));

  const addStaff = () => setStaffSalaries([...staffSalaries, { id: Date.now(), name: '', baseSalary: 0 }]);
  const updateStaff = (id: string | number, field: string, val: any) => setStaffSalaries(staffSalaries.map(s => s.id === id ? { ...s, [field]: val } : s));
  const removeStaff = (id: string | number) => setStaffSalaries(staffSalaries.filter(s => s.id !== id));

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const [closuresRes, attemptsRes, supplyRes, summaryRes, consumptionRes] = await Promise.all([
        fetch(`/api/closure/list?month=${selectedMonth}&_t=${timestamp}`, fetchOptions).catch(() => null),
        fetch(`/api/dashboard/attempts?month=${selectedMonth}&_t=${timestamp}`, fetchOptions).catch(() => null),
        fetch(`/api/supply?month=${selectedMonth}&_t=${timestamp}`, fetchOptions).catch(() => null),
        fetch(`/api/dashboard/summary?month=${selectedMonth}&_t=${timestamp}`, fetchOptions).catch(() => null),
        fetch(`/api/consumption?month=${selectedMonth}&_t=${timestamp}`, fetchOptions).catch(() => null)
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

      if (consumptionRes && consumptionRes.ok) {
        const consData = await consumptionRes.json();
        setConsumptionRecords(consData.records || []);
      } else {
        setConsumptionRecords([]);
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

  // --- FILTER CLOSURES BY MONTH ---
  const filteredClosures = closures.filter((c) => {
    const bDate = String(c.business_date || c.businessDate || c.date || '');
    if (!selectedMonth) return true;
    return bDate.includes(selectedMonth);
  }).sort((a, b) => {
    const d1 = new Date(a.business_date || a.businessDate || a.date || 0).getTime();
    const d2 = new Date(b.business_date || b.businessDate || b.date || 0).getTime();
    return d1 - d2;
  });

  // --- FILTER SUPPLIES BY MONTH ---
  const filteredSupplies = supplies.filter((s) => {
    const sDate = String(s.business_date || s.businessDate || s.date || '');
    if (!selectedMonth) return true;
    return sDate.includes(selectedMonth);
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
      { label: 'Recette Brute (MAD)', data: filteredClosures.map((c) => Number(c.gross_revenue ?? c.grossRevenue ?? c.total_revenue ?? c.totalRevenue) || 0), borderColor: POS, backgroundColor: 'rgba(127,169,138,0.10)', fill: true, tension: 0.35, pointRadius: 2.5, pointBackgroundColor: POS, borderWidth: 2 },
      { label: 'Dépenses (MAD)', data: filteredClosures.map((c) => Number(c.total_expenses ?? c.totalExpenses) || 0), borderColor: NEG, backgroundColor: 'rgba(177,128,111,0.08)', fill: true, tension: 0.35, pointRadius: 2.5, pointBackgroundColor: NEG, borderWidth: 2 },
    ],
  };

  // --- STRICT CHART FILTER: DINDE, VH, CRISPY, MOZZARELLA (catching all spellings) ---
  const chartCoreItems = ['dinde', 'vh', 'viande hachée (vh)', 'mozarella', 'mozzarella', 'crispy'];
  const inventoryVolumes: Record<string, number> = {};
  
  filteredSupplies.forEach(s => {
    (s.items || s.supply_items || []).forEach((i: any) => {
      const rawName = i.label || i.code || '';
      const cleanName = rawName.toLowerCase().trim();
      
      const isAllowed = chartCoreItems.some(allowed => cleanName.includes(allowed));
      
      if (isAllowed) {
        let standardizedLabel = i.label || i.code;
        if (cleanName.includes('dinde')) standardizedLabel = 'Dinde';
        else if (cleanName.includes('vh') || cleanName.includes('viande hachée')) standardizedLabel = 'Viande Hachée (VH)';
        else if (cleanName.includes('mozarella') || cleanName.includes('mozzarella')) standardizedLabel = 'Mozzarella';
        else if (cleanName.includes('crispy')) standardizedLabel = 'Crispy';

        inventoryVolumes[standardizedLabel] = (inventoryVolumes[standardizedLabel] || 0) + (Number(i.quantity) || 0);
      }
    });
  });

  const inventoryChartData = {
    labels: Object.keys(inventoryVolumes),
    datasets: [
      { label: 'Volume Acheté (Ce Mois)', data: Object.values(inventoryVolumes), backgroundColor: 'rgba(111,147,172,0.55)', hoverBackgroundColor: 'rgba(111,147,172,0.8)', borderRadius: 6, maxBarThickness: 38 }
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

  // --- CONSUMPTION HELPERS ---
  const getInventoryValue = (targetClosure: any, matchList: string[]) => {
    if (!targetClosure) return 0;
    const logs = targetClosure.inventory_logs || targetClosure.inventory || [];
    const inv = logs.find((i: any) => {
      const code = (i.raw_materials?.code || i.materialCode || '').toLowerCase();
      return matchList.some(m => code.includes(m));
    });
    return Number(inv?.physical_closing_count ?? inv?.physicalClosingCount ?? 0);
  };

  const getSupplyValueForDate = (businessDate: string, matchList: string[]) => {
    const supply = supplies.find(s => (s.business_date || s.businessDate || s.date) === businessDate);
    if (!supply || !(supply.items || supply.supply_items)) return 0;
    const items = supply.items || supply.supply_items || [];
    const item = items.find((i: any) => {
      const code = (i.code || i.label || '').toLowerCase();
      return matchList.some(m => code.includes(m));
    });
    return Number(item?.quantity || 0);
  };

  const totalFixedExpenses = fixedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalBaseSalaries = staffSalaries.reduce((sum, s) => sum + (Number(s.baseSalary) || 0), 0);
  const totalOverallExpenses = totalExpenses + totalFixedExpenses + totalBaseSalaries;
  const monthlyNetProfit = totalRevenue - totalOverallExpenses;
  const monthlyExpenseRatio = totalRevenue > 0 ? ((totalOverallExpenses / totalRevenue) * 100).toFixed(1) : '0';

  // --- DYNAMIC PARTNER CALCULATIONS WITH ADVANCE DEDUCTION ---
  const tayebAdvances = getStaffAdvance('Tayeb');
  const noureddineShare = monthlyNetProfit / 2;
  const tayebShare = (monthlyNetProfit / 2) - tayebAdvances;

  const selectedClosureDate = selectedClosure ? (selectedClosure.business_date || selectedClosure.businessDate || selectedClosure.date) : null;
  const selectedClosureAttempts = selectedClosureDate
    ? attempts.filter(a => String(a.closure_date || '').includes(selectedClosureDate))
    : [];

  const monthLabel = (() => {
    if (!selectedMonth) return '';
    const [y, m] = selectedMonth.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  })();

  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT_PRIMARY }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap');
        .font-display { font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif; }
        .font-num { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace; font-variant-numeric: tabular-nums; }
        body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
        input[type="month"]::-webkit-calendar-picker-indicator { filter: invert(0.6); cursor: pointer; }
      `}</style>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">

        {/* ============================= HEADER + TAB NAV ============================= */}
        <div className="rounded-[24px] overflow-hidden" style={{ background: SURFACE, border: `1px solid ${HAIRLINE}` }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-base"
                style={{ background: SURFACE_2, border: `1px solid ${HAIRLINE_STRONG}`, color: TEXT_PRIMARY }}
              >
                N
              </div>
              <div>
                <h1 className="font-display text-lg md:text-xl font-semibold tracking-tight" style={{ color: TEXT_PRIMARY }}>
                  Naclos <span style={{ color: TEXT_FAINT }} className="font-medium">— Admin</span>
                </h1>
                <p className="text-[11px]" style={{ color: TEXT_FAINT }}>Suivi financier · analyses mensuelles · audits de clôture</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: SURFACE_2, border: `1px solid ${HAIRLINE}` }}>
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_FAINT }}>Mois</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-sm font-semibold outline-none cursor-pointer [color-scheme:dark]"
                  style={{ color: TEXT_PRIMARY }}
                />
              </div>
              <button
                onClick={fetchData}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl transition hover:opacity-80"
                style={{ background: SURFACE_2, border: `1px solid ${HAIRLINE}`, color: TEXT_PRIMARY }}
              >
                <IconRefresh className="w-3.5 h-3.5" style={{ color: TEXT_MUTED }} /> Rafraîchir
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-xl transition hover:opacity-80"
                style={{ background: ACCENT.clay.soft, border: `1px solid ${ACCENT.clay.hex}33`, color: ACCENT.clay.hex }}
              >
                <IconLogout className="w-3.5 h-3.5" /> Déconnexion
              </button>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl" style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${HAIRLINE}` }}>
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const a = ACCENT[tab.accent];
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={
                      isActive
                        ? { background: SURFACE_2, color: TEXT_PRIMARY, border: `1px solid ${a.hex}40` }
                        : { background: 'transparent', color: TEXT_FAINT, border: '1px solid transparent' }
                    }
                  >
                    <Icon className="w-4 h-4" style={{ color: isActive ? a.hex : TEXT_FAINT }} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {fetchError && (
          <div
            className="text-sm font-semibold px-4 py-3 rounded-2xl flex items-center justify-between"
            style={{ background: ACCENT.clay.soft, border: `1px solid ${ACCENT.clay.hex}33`, color: '#D8B3A6' }}
          >
            <span>⚠ {fetchError}</span>
            <button onClick={fetchData} className="ml-3 underline font-bold shrink-0">Réessayer</button>
          </div>
        )}

        {loading ? (
          <div className="text-center text-sm py-24 font-medium" style={{ color: TEXT_FAINT }}>Chargement des données…</div>
        ) : (
          <>
            {/* ============================= TAB: CLÔTURES DU JOUR ============================= */}
            {activeTab === 'closures' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: TEXT_FAINT }}>Total Net Cash ({monthLabel})</span>
                    <div className="text-2xl font-bold font-num" style={{ color: POS }}>{totalNetCash.toLocaleString()} MAD</div>
                    <p className="text-xs" style={{ color: TEXT_FAINT }}>Recettes − Dépenses − Avances</p>
                  </Card>
                  <Card className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: TEXT_FAINT }}>Moyenne / Jour</span>
                    <div className="text-2xl font-bold font-num" style={{ color: TEXT_PRIMARY }}>{avgDailyRevenue.toFixed(0)} MAD</div>
                    <p className="text-xs" style={{ color: TEXT_FAINT }}>Moy. dépenses : {avgDailyExpenses.toFixed(0)} MAD</p>
                  </Card>
                  <Card className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: TEXT_FAINT }}>Ratio Dépenses (Quotidien)</span>
                    <div className="text-2xl font-bold font-num" style={{ color: NEG }}>{expenseRatio}%</div>
                    <p className="text-xs" style={{ color: TEXT_FAINT }}>Total dépenses : {totalExpenses.toLocaleString()} MAD</p>
                  </Card>
                  <Card className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: TEXT_FAINT }}>Extrêmes du Mois</span>
                    <div className="text-xs font-semibold space-y-0.5 pt-0.5" style={{ color: TEXT_PRIMARY }}>
                      <div>Max : {maxDay ? `${Number(maxDay.gross_revenue ?? maxDay.grossRevenue ?? maxDay.total_revenue ?? maxDay.totalRevenue).toLocaleString()} MAD` : '-'}</div>
                      <div>Min : {minDay ? `${Number(minDay.gross_revenue ?? minDay.grossRevenue ?? minDay.total_revenue ?? minDay.totalRevenue).toLocaleString()} MAD` : '-'}</div>
                    </div>
                  </Card>
                </div>

                <Card>
                  <SectionEyebrow accent="sage">Évolution</SectionEyebrow>
                  <h3 className="text-base font-semibold mb-4 font-display" style={{ color: TEXT_PRIMARY }}>Recettes et Dépenses par Jour</h3>
                  {filteredClosures.length > 0 ? (
                    <div className="h-[360px]">
                      <Line
                        data={chartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { labels: { color: chartTextColor, font: { weight: 'bold', size: 11 }, boxWidth: 10, usePointStyle: true } },
                            tooltip: { backgroundColor: SURFACE_2, borderColor: HAIRLINE_STRONG, borderWidth: 1, titleColor: TEXT_PRIMARY, bodyColor: TEXT_MUTED, padding: 10, cornerRadius: 8 },
                          },
                          scales: {
                            y: { beginAtZero: true, grid: { color: chartGridColor }, ticks: { color: chartTextColor, font: { size: 10 } } },
                            x: { grid: { display: false }, ticks: { color: chartTextColor, font: { size: 10 } } },
                          },
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-center py-12" style={{ color: TEXT_FAINT }}>Aucune donnée disponible.</p>
                  )}
                </Card>

                <Card className="space-y-4">
                  <SectionEyebrow accent="sage">Journal</SectionEyebrow>
                  <h3 className="text-base font-semibold font-display" style={{ color: TEXT_PRIMARY }}>Clôtures Journalières ({filteredClosures.length})</h3>
                  <div className="overflow-auto max-h-[360px] rounded-xl" style={{ border: `1px solid ${HAIRLINE}` }}>
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 z-10" style={{ background: SURFACE }}>
                        <tr className="text-[11px] uppercase tracking-wide" style={{ color: TEXT_FAINT }}>
                          <th className="py-3 px-3 font-bold">Date Prévue</th>
                          <th className="py-3 px-3 font-bold">Heure d'envoi</th>
                          <th className="py-3 px-3 font-bold">Statut</th>
                          <th className="py-3 px-3 font-bold text-right">Recette Brute</th>
                          <th className="py-3 px-3 font-bold text-right">Cash Net</th>
                          <th className="py-3 px-3 font-bold text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredClosures.map((c) => {
                          const bDate = c.business_date || c.businessDate || c.date;
                          const dayAttempts = attempts.filter(a => String(a.closure_date || '').includes(bDate));
                          const realTime = new Date(c.submitted_at || c.created_at || new Date()).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
                          const grossRev = Number(c.gross_revenue ?? c.grossRevenue ?? c.total_revenue ?? c.totalRevenue) || 0;
                          const netCsh = Number(c.net_cash ?? c.netCash) || 0;

                          return (
                            <tr key={c.id || bDate} className="transition-colors hover:bg-white/[0.02]" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
                              <td className="py-3 px-3 font-semibold" style={{ color: TEXT_PRIMARY }}>{bDate}</td>
                              <td className="py-3 px-3 text-xs font-num" style={{ color: TEXT_MUTED }}>{realTime}</td>
                              <td className="py-3 px-3">
                                {dayAttempts.length > 0 ? (
                                  <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{ background: ACCENT.gold.soft, color: ACCENT.gold.hex, border: `1px solid ${ACCENT.gold.hex}30` }}>
                                    Modifiée ({dayAttempts.length})
                                  </span>
                                ) : (
                                  <span className="text-xs font-semibold" style={{ color: TEXT_FAINT }}>Standard</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right font-num font-bold" style={{ color: POS }}>{grossRev.toLocaleString()} MAD</td>
                              <td className="py-3 px-3 text-right font-num font-bold" style={{ color: TEXT_PRIMARY }}>{netCsh.toLocaleString()} MAD</td>
                              <td className="py-3 px-3 text-center">
                                <button
                                  onClick={() => setSelectedClosure(c)}
                                  className="px-3 py-1.5 text-xs font-bold rounded-lg transition hover:opacity-80"
                                  style={{ background: SURFACE_2, color: TEXT_PRIMARY, border: `1px solid ${HAIRLINE_STRONG}` }}
                                >
                                  Voir Détails
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* ============================= TAB: ACHATS & STOCK ============================= */}
            {activeTab === 'supplies' && (
              <div className="space-y-5">
                <Card className="space-y-5">
                  <div>
                    <SectionEyebrow accent="slate">Approvisionnement</SectionEyebrow>
                    <h3 className="text-base font-semibold font-display" style={{ color: TEXT_PRIMARY }}>Volume des Achats (Dinde, VH, Mozzarella, Crispy)</h3>
                  </div>
                  {Object.keys(inventoryVolumes).length > 0 ? (
                    <div className="h-[320px]">
                      <Bar
                        data={inventoryChartData}
                        options={{
                          responsive: true, maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: { backgroundColor: SURFACE_2, borderColor: HAIRLINE_STRONG, borderWidth: 1, titleColor: TEXT_PRIMARY, bodyColor: TEXT_MUTED, padding: 10, cornerRadius: 8 },
                          },
                          scales: {
                            y: { beginAtZero: true, grid: { color: chartGridColor }, ticks: { color: chartTextColor, font: { size: 10 } } },
                            x: { grid: { display: false }, ticks: { color: chartTextColor, font: { size: 10 } } },
                          },
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-center py-12" style={{ color: TEXT_FAINT }}>Aucun achat pour ces articles ce mois.</p>
                  )}
                </Card>

                <Card className="space-y-4">
                  <SectionEyebrow accent="slate">Détail Journalier</SectionEyebrow>
                  <h4 className="text-base font-semibold font-display" style={{ color: TEXT_PRIMARY }}>Achats ({filteredSupplies.length})</h4>
                  {filteredSupplies.length > 0 ? (
                    <div className="overflow-auto max-h-[420px] rounded-xl" style={{ border: `1px solid ${HAIRLINE}` }}>
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 z-10" style={{ background: SURFACE }}>
                          <tr className="text-[11px] uppercase tracking-wide" style={{ color: TEXT_FAINT }}>
                            <th className="py-3 px-3 font-bold">Date d'Achat</th>
                            <th className="py-3 px-3 font-bold">Acheteur</th>
                            <th className="py-3 px-3 font-bold">Articles & Quantités (Complet)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSupplies.map((s, idx) => {
                            const sDate = s.business_date || s.businessDate || s.date;
                            const buyer = s.buyer_name || s.buyerName || 'Salem';
                            const itemsList = s.items || s.supply_items || [];

                            return (
                              <tr key={s.id || idx} className="transition-colors hover:bg-white/[0.02]" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
                                <td className="py-3 px-3 font-semibold" style={{ color: TEXT_PRIMARY }}>{sDate}</td>
                                <td className="py-3 px-3 font-medium" style={{ color: TEXT_MUTED }}>{buyer}</td>
                                <td className="py-3 px-3">
                                  <div className="flex flex-wrap gap-2">
                                    {itemsList.map((item: any, i: number) => (
                                      <span
                                        key={i}
                                        className="text-xs px-2.5 py-1 rounded-lg font-bold"
                                        style={{ background: ACCENT.slate.soft, color: ACCENT.slate.hex, border: `1px solid ${ACCENT.slate.hex}30` }}
                                      >
                                        {item.label || item.code}: <span className="font-num">{item.quantity} {item.unit || ''}</span>
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs italic text-center py-4" style={{ color: TEXT_FAINT }}>Aucune saisie d'achat détaillée pour ce mois.</p>
                  )}
                </Card>
              </div>
            )}

            {/* ============================= TAB: BILAN MENSUEL ============================= */}
            {activeTab === 'summary' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-7 space-y-5">
                  <Card className="space-y-4">
                    <SectionEyebrow accent="plum">Charges</SectionEyebrow>
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-semibold font-display" style={{ color: TEXT_PRIMARY }}>Dépenses Fixes (Loyer, Électricité...)</h3>
                      <button
                        onClick={addFixedExpense}
                        className="text-xs font-bold px-3 py-2 rounded-xl transition hover:opacity-80"
                        style={{ background: ACCENT.plum.soft, color: ACCENT.plum.hex, border: `1px solid ${ACCENT.plum.hex}30` }}
                      >
                        + Ajouter Charge
                      </button>
                    </div>
                    {fixedExpenses.length === 0 && <p className="text-xs italic" style={{ color: TEXT_FAINT }}>Ajoutez les charges fixes du mois pour le bilan final.</p>}
                    <div className="space-y-3">
                      {fixedExpenses.map(exp => (
                        <div key={exp.id} className="flex gap-3 items-center">
                          <input
                            type="text" placeholder="Description de la charge" value={exp.label}
                            onChange={e => updateFixedExpense(exp.id, 'label', e.target.value)}
                            className="flex-1 p-2.5 rounded-xl text-sm font-semibold outline-none"
                            style={{ background: SURFACE_2, border: `1px solid ${HAIRLINE_STRONG}`, color: TEXT_PRIMARY }}
                          />
                          <input
                            type="number" placeholder="Montant (MAD)" value={exp.amount === 0 ? '' : exp.amount}
                            onChange={e => updateFixedExpense(exp.id, 'amount', e.target.value)}
                            className="w-36 p-2.5 rounded-xl text-sm font-semibold font-num outline-none"
                            style={{ background: SURFACE_2, border: `1px solid ${HAIRLINE_STRONG}`, color: TEXT_PRIMARY }}
                          />
                          <button onClick={() => removeFixedExpense(exp.id)} className="p-2.5 rounded-xl font-bold transition hover:opacity-70" style={{ color: ACCENT.clay.hex }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <SectionEyebrow accent="plum">Aperçu Rapide</SectionEyebrow>
                    <h3 className="text-base font-semibold font-display mb-3" style={{ color: TEXT_PRIMARY }}>Composition des Charges Globales</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Achats & dépenses journalières', value: totalExpenses, color: ACCENT.clay.hex },
                        { label: 'Masse salariale (base)', value: totalBaseSalaries, color: ACCENT.gold.hex },
                        { label: 'Dépenses fixes mensuelles', value: totalFixedExpenses, color: ACCENT.plum.hex },
                      ].map((row) => {
                        const pct = totalOverallExpenses > 0 ? (row.value / totalOverallExpenses) * 100 : 0;
                        return (
                          <div key={row.label} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold" style={{ color: TEXT_MUTED }}>
                              <span>{row.label}</span>
                              <span className="font-num">{row.value.toLocaleString()} MAD</span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: SURFACE_2 }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: row.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>

                <div
                  className="lg:col-span-5 p-7 rounded-3xl flex flex-col justify-between space-y-7"
                  style={{ background: SURFACE_2, border: `1px solid ${HAIRLINE_STRONG}` }}
                >
                  <div className="space-y-5">
                    <div className="flex justify-between items-center pb-4" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                      <h3 className="text-base font-semibold tracking-wide font-display" style={{ color: ACCENT.plum.hex }}>Bilan Global Mensuel</h3>
                      <span className="text-xs font-num px-3 py-1 rounded-full capitalize" style={{ background: ACCENT.plum.soft, color: ACCENT.plum.hex, border: `1px solid ${ACCENT.plum.hex}30` }}>{monthLabel}</span>
                    </div>

                    <div className="flex justify-between items-center p-3.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <span className="text-sm font-medium" style={{ color: TEXT_MUTED }}>Recette Mensuelle (Brute)</span>
                      <span className="font-num text-base font-bold" style={{ color: POS }}>+{totalRevenue.toLocaleString()} MAD</span>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      <div className="flex justify-between items-center text-sm px-1">
                        <span style={{ color: TEXT_FAINT }}>Achats & Dépenses Journalières</span>
                        <span className="font-num font-semibold" style={{ color: NEG }}>-{totalExpenses.toLocaleString()} MAD</span>
                      </div>
                      <div className="flex justify-between items-center text-sm px-1">
                        <span style={{ color: TEXT_FAINT }}>Masse Salariale (Base)</span>
                        <span className="font-num font-semibold" style={{ color: NEG }}>-{totalBaseSalaries.toLocaleString()} MAD</span>
                      </div>
                      <div className="flex justify-between items-center text-sm px-1">
                        <span style={{ color: TEXT_FAINT }}>Dépenses Fixes Mensuelles</span>
                        <span className="font-num font-semibold" style={{ color: NEG }}>-{totalFixedExpenses.toLocaleString()} MAD</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 px-1" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
                      <span className="text-sm font-bold" style={{ color: TEXT_MUTED }}>Total des Charges Globales</span>
                      <span className="font-num text-base font-bold" style={{ color: NEG }}>-{totalOverallExpenses.toLocaleString()} MAD</span>
                    </div>

                    <div className="flex justify-between items-center p-3.5 rounded-2xl" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <span className="text-sm" style={{ color: TEXT_FAINT }}>Ratio Global Dépenses / Recette</span>
                      <span className="font-num font-bold text-base" style={{ color: ACCENT.gold.hex }}>{monthlyExpenseRatio}%</span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
                    <div className="p-6 rounded-2xl text-center" style={{ background: 'rgba(0,0,0,0.35)', border: `1px solid ${ACCENT.plum.hex}25` }}>
                      <span className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: TEXT_FAINT }}>Bénéfice Net Mensuel Réel</span>
                      <span className="text-4xl font-bold font-num tracking-tight" style={{ color: monthlyNetProfit >= 0 ? POS : NEG }}>
                        {monthlyNetProfit > 0 ? '+' : ''}{monthlyNetProfit.toLocaleString()} MAD
                      </span>
                    </div>

                    <button
                      onClick={saveMonthlySummary}
                      disabled={isSavingSummary}
                      className="w-full py-3.5 font-bold rounded-2xl transition disabled:opacity-50 text-sm tracking-wide hover:opacity-90"
                      style={{ background: ACCENT.plum.hex, color: '#12121a' }}
                    >
                      {isSavingSummary ? 'Sauvegarde en cours...' : 'Sauvegarder le Bilan Mensuel'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============================= TAB: SALAIRES & AVANCES ============================= */}
            {activeTab === 'salaries' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                <Card className="lg:col-span-2 space-y-4">
                  <SectionEyebrow accent="gold">Personnel</SectionEyebrow>
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-semibold font-display" style={{ color: TEXT_PRIMARY }}>Calcul des Salaires & Avances</h3>
                    <button
                      onClick={addStaff}
                      className="text-xs font-bold px-3 py-2 rounded-xl transition hover:opacity-80"
                      style={{ background: ACCENT.gold.soft, color: ACCENT.gold.hex, border: `1px solid ${ACCENT.gold.hex}30` }}
                    >
                      + Ajouter Personnel
                    </button>
                  </div>
                  {staffSalaries.length === 0 && <p className="text-xs italic" style={{ color: TEXT_FAINT }}>Ajoutez votre personnel pour calculer les salaires nets après déduction des avances.</p>}

                  <div className="space-y-3">
                    {staffSalaries.map(staff => {
                      const adv = getStaffAdvance(staff.name);
                      const net = (Number(staff.baseSalary) || 0) - adv;
                      return (
                        <div key={staff.id} className="p-4 rounded-xl space-y-3" style={{ background: SURFACE_2, border: `1px solid ${HAIRLINE}` }}>
                          <div className="flex gap-3 items-center">
                            <input
                              type="text" placeholder="Nom complet" value={staff.name}
                              onChange={e => updateStaff(staff.id, 'name', e.target.value)}
                              className="flex-1 p-2.5 rounded-xl text-sm font-semibold outline-none"
                              style={{ background: SURFACE, border: `1px solid ${HAIRLINE_STRONG}`, color: TEXT_PRIMARY }}
                            />
                            <input
                              type="number" placeholder="Salaire base (MAD)" value={staff.baseSalary === 0 ? '' : staff.baseSalary}
                              onChange={e => updateStaff(staff.id, 'baseSalary', e.target.value)}
                              className="w-36 p-2.5 rounded-xl text-sm font-semibold font-num outline-none"
                              style={{ background: SURFACE, border: `1px solid ${HAIRLINE_STRONG}`, color: TEXT_PRIMARY }}
                            />
                            <button onClick={() => removeStaff(staff.id)} className="p-2.5 rounded-xl font-bold transition hover:opacity-70" style={{ color: ACCENT.clay.hex }}>✕</button>
                          </div>
                          {staff.name && (
                            <div className="flex justify-between items-center text-xs px-3 py-2 rounded-xl" style={{ background: SURFACE, border: `1px solid ${HAIRLINE}` }}>
                              <span style={{ color: TEXT_FAINT }}>Avances prises : <span className="font-bold font-num" style={{ color: NEG }}>-{adv} MAD</span></span>
                              <span className="font-bold" style={{ color: TEXT_MUTED }}>Reste à payer : <span className="font-num font-bold" style={{ color: net < 0 ? NEG : POS }}>{net} MAD</span></span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card className="space-y-4">
                  <SectionEyebrow accent="gold">Ce Mois</SectionEyebrow>
                  <h3 className="text-base font-semibold font-display" style={{ color: TEXT_PRIMARY }}>Avances (Personnel)</h3>
                  <div className="space-y-3">
                    {Object.keys(staffAdvancesMap).length > 0 ? (
                      Object.entries(staffAdvancesMap).map(([name, totalAmt]) => (
                        <div key={name} className="flex justify-between items-center p-3 rounded-xl" style={{ background: ACCENT.gold.soft, border: `1px solid ${ACCENT.gold.hex}25` }}>
                          <span className="font-semibold text-sm" style={{ color: TEXT_PRIMARY }}>{name}</span>
                          <span className="font-num font-bold" style={{ color: ACCENT.gold.hex }}>{totalAmt.toLocaleString()} MAD</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs italic text-center py-6" style={{ color: TEXT_FAINT }}>Aucune avance enregistrée ce mois.</p>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* ============================= TAB: PARTAGE DES PARTS ============================= */}
            {activeTab === 'partnership' && (
              <Card>
                <h3 className="text-base font-semibold mb-5 flex items-center justify-between font-display" style={{ color: TEXT_PRIMARY }}>
                  <span>Partage des Parts (50% / 50%)</span>
                  <span className="text-xs px-3 py-1 rounded-full" style={{ background: ACCENT.clay.soft, color: ACCENT.clay.hex, border: `1px solid ${ACCENT.clay.hex}30` }}>Mr. Noureddine & Tayeb</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-5 rounded-2xl space-y-1" style={{ background: SURFACE_2, border: `1px solid ${HAIRLINE}` }}>
                    <p className="text-xs uppercase tracking-wider font-bold" style={{ color: TEXT_FAINT }}>Part de Mr. Noureddine (50%)</p>
                    <p className="text-3xl font-bold font-num mt-1" style={{ color: POS }}>
                      {noureddineShare.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                    </p>
                    <p className="text-xs" style={{ color: TEXT_FAINT }}>50% du bénéfice net réel du mois</p>
                  </div>

                  <div className="p-5 rounded-2xl space-y-1" style={{ background: SURFACE_2, border: `1px solid ${HAIRLINE}` }}>
                    <p className="text-xs uppercase tracking-wider font-bold" style={{ color: TEXT_FAINT }}>Part de Tayeb (50% − Avances)</p>
                    <div className="flex items-baseline justify-between mt-1 gap-2 flex-wrap">
                      <p className="text-3xl font-bold font-num" style={{ color: POS }}>
                        {tayebShare.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
                      </p>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg font-num" style={{ background: ACCENT.clay.soft, color: ACCENT.clay.hex, border: `1px solid ${ACCENT.clay.hex}30` }}>
                        Avances du mois : -{tayebAdvances.toLocaleString()} MAD
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: TEXT_FAINT }}>50% du bénéfice net moins ses avances de caisse enregistrées</p>
                  </div>
                </div>

                <div className="mt-5 pt-5 flex items-center justify-between text-xs" style={{ borderTop: `1px solid ${HAIRLINE}`, color: TEXT_FAINT }}>
                  <span>Basé sur le bénéfice net mensuel réel (Total net: {monthlyNetProfit.toLocaleString()} MAD)</span>
                  <span className="font-num font-bold" style={{ color: TEXT_MUTED }}>Total Partage : {(noureddineShare + tayebShare).toLocaleString()} MAD</span>
                </div>
              </Card>
            )}

            {/* ============================= TAB: CONSOMMATION ============================= */}
            {activeTab === 'consumption' && (
              <Card className="space-y-6">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div>
                    <SectionEyebrow accent="slate">Audit de Consommation</SectionEyebrow>
                    <h3 className="text-lg font-semibold font-display" style={{ color: TEXT_PRIMARY }}>
                      Comparaison : Réel (Tayeb) vs Théorique (Salem)
                    </h3>
                  </div>
                </div>

                {filteredClosures.length > 0 ? (
                  <div className="space-y-6">
                    {/* Date Selector for Detailed View */}
                    <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: SURFACE_2, border: `1px solid ${HAIRLINE}` }}>
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: TEXT_FAINT }}>Sélectionner une Date :</span>
                      <select
                        value={selectedClosureDate || ''}
                        onChange={(e) => {
                          const found = filteredClosures.find(c => (c.business_date || c.businessDate || c.date) === e.target.value);
                          setSelectedClosure(found || null);
                        }}
                        className="bg-transparent text-sm font-bold outline-none cursor-pointer p-2 rounded-lg"
                        style={{ background: SURFACE, color: TEXT_PRIMARY, border: `1px solid ${HAIRLINE_STRONG}` }}
                      >
                        {filteredClosures.map(c => {
                          const d = c.business_date || c.businessDate || c.date;
                          return <option key={d} value={d}>{d}</option>;
                        })}
                      </select>
                    </div>

                    {/* Detailed Comparison Table for Selected Date */}
                    {(() => {
                      const activeDate = selectedClosureDate || (filteredClosures[0] ? (filteredClosures[0].business_date || filteredClosures[0].businessDate || filteredClosures[0].date) : null);
                      if (!activeDate) return <p className="text-sm text-center py-8" style={{ color: TEXT_FAINT }}>Aucune date sélectionnée.</p>;

                      const closureObj = filteredClosures.find(c => (c.business_date || c.businessDate || c.date) === activeDate);
                      const prevClosureObj = closures
                        .filter(c => (c.business_date || c.businessDate || c.date) < activeDate)
                        .sort((a, b) => new Date(b.business_date || b.businessDate || b.date).getTime() - new Date(a.business_date || a.businessDate || a.date).getTime())[0];
                      
                      const consumptionRec = consumptionRecords.find(r => String(r.record_date || '') === activeDate);

                      return (
                        <div className="space-y-4">
                          <div className="overflow-auto rounded-xl" style={{ border: `1px solid ${HAIRLINE}` }}>
                            <table className="w-full text-left text-sm">
                              <thead style={{ background: SURFACE }}>
                                <tr className="text-[11px] uppercase tracking-wide" style={{ color: TEXT_FAINT }}>
                                  <th className="py-3 px-4 font-bold">Article</th>
                                  <th className="py-3 px-4 font-bold text-center">Réel Consommé (Tayeb)</th>
                                  <th className="py-3 px-4 font-bold text-center">Théorique (Ventes Salem)</th>
                                  <th className="py-3 px-4 font-bold text-center">Différence (Écart)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {CONSUMPTION_ITEMS.map((def) => {
                                  const opening = getInventoryValue(prevClosureObj, def.match);
                                  const supplyQty = getSupplyValueForDate(activeDate, def.match);
                                  const closing = getInventoryValue(closureObj, def.match);
                                  
                                  // Réel = Stock Précédent + Achats - Reste physique
                                  const actualConsumed = opening + supplyQty - closing;
                                  
                                  // Théorique depuis Salem
                                  const theoretical = consumptionRec ? Number(consumptionRec[def.theoreticalField] ?? 0) : null;
                                  
                                  const variance = theoretical !== null ? actualConsumed - theoretical : null;
                                  const ratio = theoretical && theoretical > 0 ? Math.abs(variance || 0) / theoretical : 0;
                                  const isFlagged = theoretical !== null && ratio > VARIANCE_FLAG_RATIO;

                                  return (
                                    <tr key={def.code} className="transition-colors hover:bg-white/[0.02]" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
                                      <td className="py-3 px-4 font-semibold" style={{ color: TEXT_PRIMARY }}>{def.label}</td>
                                      
                                      {/* Tayeb Real Consumption */}
                                      <td className="py-3 px-4 text-center font-num font-bold" style={{ color: TEXT_PRIMARY }}>
                                        {actualConsumed.toFixed(2)}
                                      </td>

                                      {/* Salem Theoretical Sales-based Consumption */}
                                      <td className="py-3 px-4 text-center font-num font-medium" style={{ color: TEXT_MUTED }}>
                                        {theoretical !== null ? theoretical.toFixed(2) : <span className="italic text-xs" style={{ color: TEXT_FAINT }}>Non saisi par Salem</span>}
                                      </td>

                                      {/* Difference / Variance */}
                                      <td className="py-3 px-4 text-center font-num font-bold">
                                        {variance !== null ? (
                                          <span className="px-2.5 py-1 rounded-lg text-xs" style={{
                                            background: isFlagged ? ACCENT.clay.soft : SURFACE_2,
                                            color: isFlagged ? NEG : POS,
                                            border: `1px solid ${isFlagged ? ACCENT.clay.hex + '40' : HAIRLINE}`
                                          }}>
                                            {variance > 0 ? `+${variance.toFixed(2)}` : variance.toFixed(2)} {isFlagged && '⚠'}
                                          </span>
                                        ) : (
                                          <span style={{ color: TEXT_FAINT }}>—</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-xs" style={{ color: TEXT_FAINT }}>
                            * Légende : La différence indique l'écart entre le stock réellement sorti de l'inventaire de Tayeb et ce que les ventes de Salem justifient. Un écart supérieur à 10% (marqué ⚠) indique une divergence potentielle.
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-center py-12" style={{ color: TEXT_FAINT }}>Aucune clôture disponible pour ce mois.</p>
                )}
              </Card>
            )}

          </>
        )}
      </div>

      {/* ============================= CLOSURE DETAILS MODAL ============================= */}
      {selectedClosure && activeTab === 'closures' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl space-y-6" style={{ background: SURFACE, border: `1px solid ${HAIRLINE_STRONG}` }}>
            <div className="flex justify-between items-center pb-4" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
              <h2 className="text-lg font-semibold font-display" style={{ color: TEXT_PRIMARY }}>Détails de Clôture — {selectedClosureDate}</h2>
              <button
                onClick={() => setSelectedClosure(null)}
                className="w-8 h-8 rounded-full font-bold transition hover:opacity-80"
                style={{ background: SURFACE_2, color: TEXT_MUTED }}
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl text-center font-num" style={{ background: SURFACE_2 }}>
              <div><span className="text-[10px] uppercase block" style={{ color: TEXT_FAINT }}>Recette</span><span className="text-base font-bold" style={{ color: POS }}>{Number(selectedClosure.gross_revenue ?? selectedClosure.grossRevenue ?? selectedClosure.total_revenue ?? selectedClosure.totalRevenue).toLocaleString()} MAD</span></div>
              <div><span className="text-[10px] uppercase block" style={{ color: TEXT_FAINT }}>Dépenses</span><span className="text-base font-bold" style={{ color: NEG }}>{Number(selectedClosure.total_expenses ?? selectedClosure.totalExpenses).toLocaleString()} MAD</span></div>
              <div><span className="text-[10px] uppercase block" style={{ color: TEXT_FAINT }}>Cash Net</span><span className="text-base font-bold" style={{ color: TEXT_PRIMARY }}>{Number(selectedClosure.net_cash ?? selectedClosure.netCash).toLocaleString()} MAD</span></div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase mb-2" style={{ color: TEXT_FAINT }}>Dépenses du Jour</h4>
              {(selectedClosure.expenses || []).length > 0 ? (
                <div className="space-y-1">
                  {selectedClosure.expenses.map((e: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs p-2 rounded" style={{ background: SURFACE_2, border: `1px solid ${HAIRLINE}` }}>
                      <span style={{ color: TEXT_MUTED }}>{e.label}</span>
                      <span className="font-num font-bold" style={{ color: NEG }}>{e.amount} MAD</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs italic" style={{ color: TEXT_FAINT }}>Aucune dépense.</p>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase mb-2" style={{ color: TEXT_FAINT }}>Avances du Personnel</h4>
              {(selectedClosure.staffAdvances || selectedClosure.staff_advances || []).length > 0 ? (
                <div className="space-y-1">
                  {(selectedClosure.staffAdvances || selectedClosure.staff_advances).map((a: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs p-2 rounded" style={{ background: SURFACE_2, border: `1px solid ${HAIRLINE}` }}>
                      <span style={{ color: TEXT_MUTED }}>{a.employeeName || a.employee_name}</span>
                      <span className="font-num font-bold" style={{ color: ACCENT.gold.hex }}>{a.amount} MAD</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs italic" style={{ color: TEXT_FAINT }}>Aucune avance.</p>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase mb-2" style={{ color: TEXT_FAINT }}>État du Stock Réel</h4>
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
                      <div key={idx} className="p-2 rounded text-xs" style={{ background: SURFACE_2, border: `1px solid ${HAIRLINE}` }}>
                        <span className="block font-medium" style={{ color: TEXT_MUTED }}>{label}</span>
                        <span className="font-num font-bold" style={{ color: TEXT_PRIMARY }}>{i.physical_closing_count ?? i.physicalClosingCount}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs italic" style={{ color: TEXT_FAINT }}>Aucun stock enregistré en base de données.</p>
              )}
            </div>

            {(selectedClosure.notes || selectedClosure.discrepancy_summary) && (
              <div>
                <h4 className="text-xs font-bold uppercase mb-1" style={{ color: TEXT_FAINT }}>Notes Actuelles</h4>
                <p className="text-xs p-3 rounded italic" style={{ background: ACCENT.gold.soft, color: '#D8C4A2', border: `1px solid ${ACCENT.gold.hex}25` }}>"{selectedClosure.notes || selectedClosure.discrepancy_summary}"</p>
              </div>
            )}

            {(selectedClosure.receiptImageUrl || selectedClosure.receipt_image_url) && (
              <div>
                <h4 className="text-xs font-bold uppercase mb-2" style={{ color: TEXT_FAINT }}>Justificatif / Reçu Caisse</h4>
                <div className="rounded-xl p-2 text-center" style={{ background: SURFACE_2, border: `1px solid ${HAIRLINE}` }}>
                  <img src={selectedClosure.receiptImageUrl || selectedClosure.receipt_image_url} alt="Reçu" className="max-h-60 mx-auto rounded-lg" style={{ border: `1px solid ${HAIRLINE}` }} />
                  <a href={selectedClosure.receiptImageUrl || selectedClosure.receipt_image_url} target="_blank" rel="noreferrer" className="text-xs mt-2 inline-block font-bold hover:underline" style={{ color: ACCENT.slate.hex }}>Ouvrir en plein écran ↗</a>
                </div>
              </div>
            )}

            {selectedClosureAttempts.length > 0 && (
              <div className="mt-8 pt-6" style={{ borderTop: `2px solid ${ACCENT.clay.hex}30` }}>
                <h3 className="text-base font-semibold mb-4 font-display" style={{ color: ACCENT.clay.hex }}>Historique des Soumissions (Tentatives du jour)</h3>
                <div className="space-y-3">
                  {selectedClosureAttempts.map((attempt, idx) => {
                    const data = attempt.attempted_data || attempt;
                    const expTotal = (data.expenses || []).reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
                    return (
                      <div key={idx} className="p-4 rounded-xl text-sm" style={{ background: ACCENT.clay.soft, border: `1px solid ${ACCENT.clay.hex}30` }}>
                        <div className="flex justify-between pb-2 mb-2" style={{ borderBottom: `1px solid ${ACCENT.clay.hex}25` }}>
                          <span className="font-bold" style={{ color: ACCENT.clay.hex }}>Tentative #{idx + 1}</span>
                          <span className="text-xs font-num" style={{ color: TEXT_FAINT }}>{new Date(attempt.attempted_at || new Date()).toLocaleTimeString()}</span>
                        </div>
                        <ul className="space-y-1" style={{ color: TEXT_MUTED }}>
                          <li><strong style={{ color: TEXT_PRIMARY }}>Recette Brute :</strong> {data.grossRevenue || data.gross_revenue} MAD</li>
                          <li><strong style={{ color: TEXT_PRIMARY }}>Dépenses :</strong> {expTotal} MAD</li>
                          {data.notes && <li><strong style={{ color: TEXT_PRIMARY }}>Note :</strong> "{data.notes}"</li>}
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