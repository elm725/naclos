import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';
import { computeClosureTotals } from '@/lib/calculations';
import type { DailyClosureInput } from '@/types';

const expenseSchema = z.object({
  categoryCode: z.string().optional().default('general'),
  label: z.string().min(1),
  amount: z.number().min(0),
});

const advanceSchema = z.object({
  employeeName: z.string().min(1),
  amount: z.number().min(0),
  note: z.string().optional(),
});

// Permissive inventory schema: allows empty/blank rows without failing validation
const inventorySchema = z.object({
  materialCode: z.string().optional().default(''),
  materialLabel: z.string().optional().default(''),
  unit: z.enum(['kg', 'unit', 'pack', 'bag', 'can']).optional().default('unit'),
  openingStock: z.number().optional().default(0),
  supplyPurchased: z.number().optional().default(0),
  consumedAmount: z.number().optional().default(0),
  physicalClosingCount: z.number().optional().default(0),
});

const menuSaleSchema = z.object({
  categoryCode: z.string().optional().default('general'),
  itemCode: z.string().optional().default(''),
  itemLabel: z.string().optional().default(''),
  quantitySold: z.number().min(0).optional().default(0),
});

const closureInputSchema = z.object({
  businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'businessDate must be YYYY-MM-DD'),
  storeId: z.string().optional().default('main'),
  managerName: z.string().min(1),
  receiptImageUrl: z.string().nullable().optional(),
  grossRevenue: z.number().min(0),
  expenses: z.array(expenseSchema).optional().default([]),
  staffAdvances: z.array(advanceSchema).optional().default([]),
  inventory: z.array(inventorySchema).optional().default([]),
  menuSales: z.array(menuSaleSchema).optional().default([]),
});

export async function POST(request: NextRequest) {
  let payload: DailyClosureInput & { receiptImageUrl?: string | null };

  try {
    const json = await request.json();
    payload = closureInputSchema.parse(json);
  } catch (err) {
    console.error('Validation Error:', err);
    return NextResponse.json(
      { error: 'Invalid submission payload', details: err instanceof Error ? err.message : err },
      { status: 400 }
    );
  }

  // Enforce same-day submission rule
  const today = new Date().toISOString().split('T')[0];
  if (payload.businessDate !== today) {
    return NextResponse.json(
      { error: "Les clôtures ne peuvent être soumises que pour la date d'aujourd'hui." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();

  // Theft-prevention check
  const { data: existing } = await supabase
    .from('daily_closures')
    .select('id, status')
    .eq('business_date', payload.businessDate)
    .eq('store_id', payload.storeId)
    .maybeSingle();

  if (existing && existing.status === 'locked') {
    return NextResponse.json(
      { error: `A closure for ${payload.businessDate} is locked. Admin approval is required to edit.` },
      { status: 409 }
    );
  }

  const totals = computeClosureTotals(payload);

  // 1. Upsert parent row
  const { data: closure, error: closureError } = await supabase
    .from('daily_closures')
    .upsert(
      {
        id: existing?.id,
        business_date: payload.businessDate,
        store_id: payload.storeId,
        manager_name: payload.managerName,
        receipt_image_url: payload.receiptImageUrl ?? null,
        gross_revenue: payload.grossRevenue,
        total_expenses: totals.totalExpenses,
        total_staff_advances: totals.totalStaffAdvances,
        net_cash: totals.netCash,
        net_profit: totals.netProfit,
        has_inventory_discrepancy: totals.hasInventoryDiscrepancy,
        discrepancy_summary: totals.discrepancySummary,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'business_date,store_id' }
    )
    .select()
    .single();

  if (closureError || !closure) {
    console.error('Closure Upsert Error:', closureError);
    return NextResponse.json({ error: 'Failed to save closure', details: closureError?.message }, { status: 500 });
  }

  const closureId = closure.id;

  try {
    // 2. Delete existing child records
    await supabase.from('expenses').delete().eq('closure_id', closureId);
    await supabase.from('staff_advances').delete().eq('closure_id', closureId);
    await supabase.from('inventory_logs').delete().eq('closure_id', closureId);
    await supabase.from('menu_sales').delete().eq('closure_id', closureId);

    // 3. Insert child records
    if (payload.expenses.length > 0) {
      const { data: categories } = await supabase.from('expense_categories').select('id, code');
      const catMap = Object.fromEntries((categories || []).map((c: any) => [c.code, c.id]));
      
      const validExpenses = payload.expenses.filter((e) => e.label && e.amount > 0);
      if (validExpenses.length > 0) {
        const { error: expErr } = await supabase.from('expenses').insert(
          validExpenses.map((e) => ({
            closure_id: closureId,
            category_id: catMap[e.categoryCode] ?? null,
            label: e.label,
            amount: e.amount,
          }))
        );
        if (expErr) console.error('Expenses Insert Error:', expErr);
      }
    }

    if (payload.staffAdvances.length > 0) {
      const validAdvances = payload.staffAdvances.filter((a) => a.employeeName && a.amount > 0);
      if (validAdvances.length > 0) {
        const { error: advErr } = await supabase.from('staff_advances').insert(
          validAdvances.map((a) => ({
            closure_id: closureId,
            employee_name: a.employeeName,
            amount: a.amount,
            note: a.note ?? null,
          }))
        );
        if (advErr) console.error('Advances Insert Error:', advErr);
      }
    }

    if (payload.inventory.length > 0) {
      const { data: materials } = await supabase.from('raw_materials').select('id, code');
      const matMap = Object.fromEntries((materials || []).map((m: any) => [m.code, m.id]));
      
      // Only process inventory entries with a valid material code
      const validInventory = payload.inventory.filter((i) => i.materialCode && matMap[i.materialCode]);

      if (validInventory.length > 0) {
        const { error: invErr } = await supabase.from('inventory_logs').insert(
          validInventory.map((i) => ({
            closure_id: closureId,
            raw_material_id: matMap[i.materialCode],
            opening_stock: i.openingStock,
            supply_purchased: i.supplyPurchased,
            consumed_amount: i.consumedAmount,
            physical_closing_count: i.physicalClosingCount,
          }))
        );
        if (invErr) console.error('Inventory Insert Error:', invErr);
      }
    }

    if (payload.menuSales && payload.menuSales.length > 0) {
      const { data: items } = await supabase.from('menu_items').select('id, code, label_fr');
      
      const itemMapByCode = Object.fromEntries((items || []).map((m: any) => [m.code, m.id]));
      const itemMapByLabel = Object.fromEntries((items || []).map((m: any) => [m.label_fr?.toLowerCase(), m.id]));

      // Map and deduplicate sales by summing quantities for identical items
      const salesMap = new Map<string, number>();

      for (const s of payload.menuSales) {
        if (s.quantitySold <= 0) continue;
        const itemId = (s.itemCode && itemMapByCode[s.itemCode]) || (s.itemLabel && itemMapByLabel[s.itemLabel.toLowerCase()]);
        if (itemId) {
          salesMap.set(itemId, (salesMap.get(itemId) || 0) + s.quantitySold);
        }
      }

      const salesToInsert = Array.from(salesMap.entries()).map(([menu_item_id, quantity_sold]) => ({
        closure_id: closureId,
        menu_item_id,
        quantity_sold,
      }));

      if (salesToInsert.length > 0) {
        const { error: salesErr } = await supabase.from('menu_sales').insert(salesToInsert);
        if (salesErr) console.error('Sales Insert Error:', salesErr);
      }
    }

    // 4. Audit Trail
    await supabase.from('audit_log').insert({
      closure_id: closureId,
      actor: payload.managerName,
      action: 'submit',
      detail: { hasInventoryDiscrepancy: totals.hasInventoryDiscrepancy },
    });

    // 5. Trigger Nightly Email asynchronously
    const reportUrl = new URL('/api/reports/email', request.url);
    fetch(reportUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': process.env.CRON_SECRET || '',
      },
      body: JSON.stringify({ closureId }),
    }).catch((err) => console.error('Failed to trigger report:', err));

    return NextResponse.json({
      success: true,
      closureId,
      status: 'submitted',
      totals: {
        totalExpenses: totals.totalExpenses,
        totalStaffAdvances: totals.totalStaffAdvances,
        netCash: totals.netCash,
        netProfit: totals.netProfit,
      },
      inventoryFlags: totals.inventoryFlags,
    });

  } catch (err) {
    console.error('Child Insert Process Error:', err);
    return NextResponse.json(
      { error: 'Failed to process child records', details: err instanceof Error ? err.message : err },
      { status: 500 }
    );
  }
}