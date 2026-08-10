import type {
  DailyClosureInput,
  ExpenseEntry,
  StaffAdvanceEntry,
  InventoryEntry,
  InventoryVarianceFlag,
} from '@/types';

/** Sum all logged expense items. */
export function calculateTotalExpenses(expenses: ExpenseEntry[]): number {
  return round2(expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0));
}

/** Sum all staff advances / employee loans. */
export function calculateTotalStaffAdvances(advances: StaffAdvanceEntry[]): number {
  return round2(advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0));
}

/** Net Cash = Gross Revenue - Daily Expenses - Staff Advances */
export function calculateNetCash(grossRevenue: number, totalExpenses: number, totalStaffAdvances: number): number {
  return round2(grossRevenue - totalExpenses - totalStaffAdvances);
}

/** Net Profit = Revenue - Expenses (advances are a receivable, not a true cost) */
export function calculateNetProfit(grossRevenue: number, totalExpenses: number): number {
  return round2(grossRevenue - totalExpenses);
}

/**
 * Calculated Remaining Stock = (Opening Stock + Supply Purchased) - Consumed Amount
 */
export function calculateRemainingStock(entry: Pick<InventoryEntry, 'openingStock' | 'supplyPurchased' | 'consumedAmount'>): number {
  return round3(entry.openingStock + entry.supplyPurchased - entry.consumedAmount);
}

/**
 * Variance = Physical Closing Count - Calculated Remaining Stock.
 * Negative variance = stock is missing (possible theft / waste / portion inflation).
 */
export function calculateVariance(entry: InventoryEntry): number {
  const expected = calculateRemainingStock(entry);
  return round3(entry.physicalClosingCount - expected);
}

const VARIANCE_TOLERANCE = 0.01; // absolute unit tolerance before flagging (accounts for rounding)

export function isInventoryFlagged(entry: InventoryEntry): boolean {
  return Math.abs(calculateVariance(entry)) > VARIANCE_TOLERANCE;
}

/**
 * Builds human-readable, French-language discrepancy flags for the report and UI,
 * e.g. "Manque 500g Dinde" (missing) or "Surplus 2 unités Burger Buns" (unexplained surplus).
 */
export function buildInventoryFlags(inventory: InventoryEntry[]): InventoryVarianceFlag[] {
  const flags: InventoryVarianceFlag[] = [];

  for (const entry of inventory) {
    const variance = calculateVariance(entry);
    if (Math.abs(variance) <= VARIANCE_TOLERANCE) continue;

    const magnitude = Math.abs(variance);
    const displayAmount = entry.unit === 'kg' && magnitude < 1
      ? `${Math.round(magnitude * 1000)}g`
      : `${trimTrailingZeros(magnitude)} ${pluralizeUnit(entry.unit, magnitude)}`;

    const message = variance < 0
      ? `Manque ${displayAmount} ${entry.materialLabel}`
      : `Surplus ${displayAmount} ${entry.materialLabel}`;

    flags.push({
      materialLabel: entry.materialLabel,
      variance,
      unit: entry.unit,
      message,
    });
  }

  return flags;
}

/**
 * Cross-checks raw-material consumption entered by the manager against what the
 * recipe/portion standard implies the recorded sales volume should have consumed.
 * This is a lightweight, pluggable hook: wire `recipeMap` to your actual recipe
 * table (grams of each raw material per menu item) to get real theft-detection power.
 *
 * Returns items where actual logged consumption significantly exceeds
 * (or falls short of) the sales-implied consumption — a signal of portion
 * inflation, unrecorded giveaways, or inventory theft.
 */
export interface RecipeUsage {
  materialCode: string;
  gramsOrUnitsPerItem: number; // usage of this material per single unit of the menu item
}

export function crossCheckConsumptionAgainstSales(
  inventory: InventoryEntry[],
  menuSales: DailyClosureInput['menuSales'],
  recipeMap: Record<string, RecipeUsage[]>, // keyed by itemCode
  toleranceRatio = 0.1 // 10% tolerance before flagging
): Array<{ materialCode: string; expectedConsumption: number; loggedConsumption: number; deltaPct: number }> {
  const expectedByMaterial: Record<string, number> = {};

  for (const sale of menuSales) {
    const usageRules = recipeMap[sale.itemCode];
    if (!usageRules) continue;
    for (const rule of usageRules) {
      expectedByMaterial[rule.materialCode] =
        (expectedByMaterial[rule.materialCode] || 0) + rule.gramsOrUnitsPerItem * sale.quantitySold;
    }
  }

  const results: Array<{ materialCode: string; expectedConsumption: number; loggedConsumption: number; deltaPct: number }> = [];

  for (const entry of inventory) {
    const expected = expectedByMaterial[entry.materialCode];
    if (expected === undefined || expected === 0) continue;

    const delta = (entry.consumedAmount - expected) / expected;
    if (Math.abs(delta) > toleranceRatio) {
      results.push({
        materialCode: entry.materialCode,
        expectedConsumption: round3(expected),
        loggedConsumption: entry.consumedAmount,
        deltaPct: round2(delta * 100),
      });
    }
  }

  return results;
}

/** Convenience: computes every derived total for a full closure payload in one pass. */
export function computeClosureTotals(input: DailyClosureInput) {
  const totalExpenses = calculateTotalExpenses(input.expenses);
  const totalStaffAdvances = calculateTotalStaffAdvances(input.staffAdvances);
  const netCash = calculateNetCash(input.grossRevenue, totalExpenses, totalStaffAdvances);
  const netProfit = calculateNetProfit(input.grossRevenue, totalExpenses);

  const enrichedInventory = input.inventory.map((entry) => ({
    ...entry,
    calculatedRemainingStock: calculateRemainingStock(entry),
    variance: calculateVariance(entry),
    isFlagged: isInventoryFlagged(entry),
  }));

  const flags = buildInventoryFlags(enrichedInventory);
  const hasInventoryDiscrepancy = flags.length > 0;

  return {
    totalExpenses,
    totalStaffAdvances,
    netCash,
    netProfit,
    enrichedInventory,
    inventoryFlags: flags,
    hasInventoryDiscrepancy,
    discrepancySummary: flags.map((f) => f.message).join('; '),
  };
}

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
function round3(n: number): number {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}
function trimTrailingZeros(n: number): string {
  return String(Math.round(n * 1000) / 1000);
}
function pluralizeUnit(unit: string, qty: number): string {
  const plural = qty > 1 ? 's' : '';
  switch (unit) {
    case 'kg': return 'kg';
    case 'unit': return `unité${plural}`;
    case 'pack': return `pack${plural}`;
    case 'bag': return `sac${plural}`;
    case 'can': return `canette${plural}`;
    default: return unit;
  }
}
