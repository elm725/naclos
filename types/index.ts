// ============================================================================
// SHARED TYPES — Naclos Operations & Audit Portal
// ============================================================================

export type ClosureStatus = 'draft' | 'submitted' | 'locked' | 'admin_reopened';

export interface ExpenseEntry {
  id?: string;
  categoryCode: string;   // e.g. 'fournisseur', 'salem', 'vh', 'gaz'
  label: string;          // Nom
  amount: number;         // Prix en DH
}

export interface StaffAdvanceEntry {
  id?: string;
  employeeName: string;
  amount: number;
  note?: string;
}

export interface InventoryEntry {
  id?: string;
  materialCode: string;         // e.g. 'dinde', 'vh', 'mozzarella'
  materialLabel: string;
  unit: 'kg' | 'unit' | 'pack' | 'bag' | 'can';
  openingStock: number;
  supplyPurchased: number;
  consumedAmount: number;
  physicalClosingCount: number;
  // derived, computed client-side for live UI feedback (server recomputes authoritatively)
  calculatedRemainingStock?: number;
  variance?: number;
  isFlagged?: boolean;
}

export interface MenuSaleEntry {
  categoryCode: string;
  itemCode: string;
  itemLabel: string;
  quantitySold: number;
}

export interface DailyClosureInput {
  businessDate: string;      // ISO date 'YYYY-MM-DD'
  storeId?: string;
  managerName: string;
  grossRevenue: number;
  expenses: ExpenseEntry[];
  staffAdvances: StaffAdvanceEntry[];
  inventory: InventoryEntry[];
  menuSales: MenuSaleEntry[];
}

export interface DailyClosureRecord extends DailyClosureInput {
  id: string;
  totalExpenses: number;
  totalStaffAdvances: number;
  netCash: number;
  netProfit: number;
  status: ClosureStatus;
  hasInventoryDiscrepancy: boolean;
  discrepancySummary?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryVarianceFlag {
  materialLabel: string;
  variance: number;         // negative = missing stock
  unit: string;
  message: string;          // e.g. "Manque 500g Dinde"
}

export interface DashboardSummary {
  periodLabel: string;
  totalRevenue: number;
  totalExpenses: number;
  totalStaffAdvances: number;
  netProfit: number;
  netMargin: number;         // net profit / revenue
  expenseRatio: number;      // expenses / revenue
  discrepancyDays: number;
  dailyTrend: Array<{
    date: string;
    revenue: number;
    expenses: number;
    netProfit: number;
  }>;
  expenseBreakdown: Array<{ category: string; amount: number }>;
}

export const EXPENSE_CATEGORIES: Array<{ code: string; label: string }> = [
  { code: 'fournisseur', label: 'Fournisseur' },
  { code: 'salem', label: 'Salem (Viande/Volaille)' },
  { code: 'vh', label: 'VH (Viande Hachée)' },
  { code: 'chika', label: 'Chika (Crispy)' },
  { code: 'frite', label: 'Frite' },
  { code: 'gaz', label: 'Gaz' },
  { code: 'legumes', label: 'Légumes / Khodra' },
  { code: 'oni', label: 'Oni' },
  { code: 'dej_staff', label: 'Déjeuner / Staff Food' },
  { code: 'oils_sauces', label: 'Huiles / Sauces' },
  { code: 'nettoyage', label: 'Nettoyage' },
  { code: 'maintenance', label: 'Maintenance' },
  { code: 'divers', label: 'Divers' },
];

export const RAW_MATERIALS: Array<{ code: string; label: string; unit: InventoryEntry['unit'] }> = [
  { code: 'dinde', label: 'Dinde (Turkey Breast)', unit: 'kg' },
  { code: 'vh', label: 'Viande Hachée', unit: 'kg' },
  { code: 'mozzarella', label: 'Mozzarella', unit: 'kg' },
  { code: 'crispy_chicken', label: 'Crispy Chicken', unit: 'kg' },
  { code: 'tortilla', label: 'Tortilla / Pain Tacos', unit: 'pack' },
  { code: 'chika', label: 'Chika', unit: 'kg' },
  { code: 'burger_buns', label: 'Burger Buns', unit: 'unit' },
  { code: 'frites', label: 'Frites', unit: 'bag' },
  { code: 'soda_cans', label: 'Soda Cans', unit: 'can' },
  { code: 'eau_petite', label: 'Eau Petite', unit: 'unit' },
  { code: 'eau_grande', label: 'Eau Grande', unit: 'unit' },
  { code: 'fromage', label: 'Fromage / Slices', unit: 'pack' },
  { code: 'fruits_de_mer', label: 'Fruits de Mer', unit: 'kg' },
  { code: 'thon', label: 'Thon', unit: 'kg' },
  { code: 'jambon', label: 'Jambon', unit: 'kg' },
];

export const MENU_CATALOG: Array<{ categoryCode: string; categoryLabel: string; items: string[] }> = [
  { categoryCode: 'tacos', categoryLabel: 'Tacos', items: ['Dinde', 'Fried Chicken', 'Kefta', 'Mixte'] },
  { categoryCode: 'burgers', categoryLabel: 'Burgers', items: ['Hamburger', 'Chicken Burger', 'Cheese Burger', 'Double Cheese Burger'] },
  { categoryCode: 'pizza_p', categoryLabel: 'Pizza Petite', items: ['Viande Hachée', 'Margarita', 'Poulet', 'Thon', 'Naclos', 'Fruit de Mer'] },
  { categoryCode: 'pizza_m', categoryLabel: 'Pizza Moyenne', items: ['Viande Hachée', 'Margarita', 'Poulet', 'Thon', 'Naclos', 'Fruit de Mer'] },
  { categoryCode: 'gratins', categoryLabel: 'Gratins', items: ['Poulet', 'Jambon', 'Viande Hachée', 'Mixte'] },
  { categoryCode: 'italien', categoryLabel: 'Italien / Pâtes', items: ['Dinde', 'Fried Chicken', 'Kefta', 'Mixte'] },
  { categoryCode: 'jus', categoryLabel: 'Jus Naturels', items: ['Orange', 'Ananas', 'Mangue', 'Avocat', 'Panaché', 'Tiramisu'] },
  { categoryCode: 'boissons', categoryLabel: 'Boissons & Supports', items: ['Soda', 'Eau P', 'Eau G', 'Frites Extra', 'Lben', 'Sauces'] },
];
