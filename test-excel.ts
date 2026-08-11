import fs from 'fs';
import path from 'path';
import { generateDailyExcelBuffer } from './lib/excelExport';
import type { DailyClosureRecord } from './types';

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('❌ Environment variables missing! Make sure to run with --env-file=.env.local');
    return;
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };

  // 1. Fetch the latest daily closure
  const closureRes = await fetch(`${url}/rest/v1/daily_closures?select=*&order=created_at.desc&limit=1`, { headers });
  const closures = await closureRes.json();
  const closure = closures[0];

  if (!closure) {
    console.error('❌ No closures found in Supabase database.');
    return;
  }

  const closureId = closure.id;

  // 2. Fetch expenses, advances, inventory, and menu sales using raw REST
  const [expensesRes, advancesRes, inventoryRes, salesRes] = await Promise.all([
    fetch(`${url}/rest/v1/expenses?closure_id=eq.${closureId}&select=*,expense_categories(code)`, { headers }),
    fetch(`${url}/rest/v1/staff_advances?closure_id=eq.${closureId}&select=*`, { headers }),
    fetch(`${url}/rest/v1/inventory_logs?closure_id=eq.${closureId}&select=*,raw_materials(code,label_fr,unit)`, { headers }),
    fetch(`${url}/rest/v1/menu_sales?closure_id=eq.${closureId}&select=*,menu_items(code,label_fr,menu_categories(code))`, { headers }),
  ]);

  const expenses = await expensesRes.json();
  const advances = await advancesRes.json();
  const inventory = await inventoryRes.json();
  const sales = await salesRes.json();

  const realClosureRecord: DailyClosureRecord = {
    id: closure.id,
    businessDate: closure.business_date,
    storeId: closure.store_id,
    managerName: closure.manager_name,
    grossRevenue: Number(closure.gross_revenue),
    totalExpenses: Number(closure.total_expenses),
    totalStaffAdvances: Number(closure.total_staff_advances),
    netCash: Number(closure.net_cash),
    netProfit: Number(closure.net_profit),
    status: closure.status,
    hasInventoryDiscrepancy: closure.has_inventory_discrepancy,
    discrepancySummary: closure.discrepancy_summary,
    createdAt: closure.created_at,
    updatedAt: closure.updated_at,
    expenses: (expenses || []).map((e: any) => ({
      categoryCode: e.expense_categories?.code || 'divers',
      label: e.label,
      amount: Number(e.amount),
    })),
    staffAdvances: (advances || []).map((a: any) => ({
      employeeName: a.employee_name,
      amount: Number(a.amount),
      note: a.note,
    })),
    inventory: (inventory || []).map((i: any) => ({
      materialCode: i.raw_materials?.code,
      materialLabel: i.raw_materials?.label_fr || 'Ingrédient',
      unit: i.raw_materials?.unit || 'kg',
      openingStock: Number(i.opening_stock),
      supplyPurchased: Number(i.supply_purchased),
      consumedAmount: Number(i.consumed_amount),
      physicalClosingCount: Number(i.physical_closing_count),
      calculatedRemainingStock: Number(i.calculated_remaining_stock),
      variance: Number(i.variance),
      isFlagged: i.is_flagged,
    })),
    menuSales: (sales || []).map((s: any) => ({
      categoryCode: s.menu_items?.menu_categories?.code || '',
      itemCode: s.menu_items?.code || '',
      itemLabel: s.menu_items?.label_fr || 'Article',
      quantitySold: Number(s.quantity_sold),
    })),
  };

  const buffer = await generateDailyExcelBuffer(realClosureRecord);
  const outputPath = path.join(process.cwd(), 'Naclos_Real_Submission.xlsx');
  fs.writeFileSync(outputPath, buffer);

  console.log(`\n✅ REAL Excel report generated successfully! Saved to:\n   ${outputPath}\n`);
}

run().catch(console.error);