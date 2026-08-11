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
  notes: z.string().optional().default(''),
  expenses: z.array(expenseSchema).optional().default([]),
  staffAdvances: z.array(advanceSchema).optional().default([]),
  inventory: z.array(inventorySchema).optional().default([]),
  menuSales: z.array(menuSaleSchema).optional().default([]),
});

export async function POST(request: NextRequest) {
  let payload: DailyClosureInput & { receiptImageUrl?: string | null; notes?: string };
  let rawJson: any;

  try {
    rawJson = await request.json();
    payload = closureInputSchema.parse(rawJson);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid submission payload' }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0];
  if (payload.businessDate !== today) {
    return NextResponse.json({ error: "Les clôtures ne peuvent être soumises que pour la date d'aujourd'hui." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  // 1. ALWAYS log the exact incoming data as a submission attempt
  await supabase.from('closure_submission_attempts').insert({
    closure_date: payload.businessDate,
    submitted_by: payload.managerName,
    attempted_data: rawJson,
  });

  // 2. Check if a closure already exists to OVERWRITE it instead of failing
  const { data: existing } = await supabase
    .from('daily_closures')
    .select('id')
    .eq('business_date', payload.businessDate)
    .eq('store_id', payload.storeId)
    .maybeSingle();

  if (existing) {
    // Manually clean up old child records to prevent conflicts
    await supabase.from('expenses').delete().eq('closure_id', existing.id);
    await supabase.from('staff_advances').delete().eq('closure_id', existing.id);
    await supabase.from('inventory_logs').delete().eq('closure_id', existing.id);
    await supabase.from('menu_sales').delete().eq('closure_id', existing.id);
    await supabase.from('report_deliveries').delete().eq('closure_id', existing.id);
    await supabase.from('audit_log').delete().eq('closure_id', existing.id);
    await supabase.from('daily_closures').delete().eq('id', existing.id);
  }

  const totals = computeClosureTotals(payload);

  // 3. Insert fresh primary closure row
  const { data: closure, error: closureError } = await supabase
    .from('daily_closures')
    .insert({
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
      discrepancy_summary: payload.notes || totals.discrepancySummary,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (closureError || !closure) {
    return NextResponse.json({ error: 'Failed to save closure' }, { status: 500 });
  }

  const closureId = closure.id;

  try {
    // 4. Insert fresh child records
    if (payload.expenses.length > 0) {
      const validExpenses = payload.expenses.filter((e) => e.label && e.amount > 0);
      if (validExpenses.length > 0) {
        await supabase.from('expenses').insert(
          validExpenses.map((e) => ({ closure_id: closureId, label: e.label, amount: e.amount }))
        );
      }
    }

    if (payload.staffAdvances.length > 0) {
      const validAdvances = payload.staffAdvances.filter((a) => a.employeeName && a.amount > 0);
      if (validAdvances.length > 0) {
        await supabase.from('staff_advances').insert(
          validAdvances.map((a) => ({ closure_id: closureId, employee_name: a.employeeName, amount: a.amount, note: a.note }))
        );
      }
    }

    if (payload.inventory.length > 0) {
      const { data: materials } = await supabase.from('raw_materials').select('id, code');
      const matMap = Object.fromEntries((materials || []).map((m: any) => [m.code, m.id]));
      const validInventory = payload.inventory.filter((i) => i.materialCode && matMap[i.materialCode]);

      if (validInventory.length > 0) {
        await supabase.from('inventory_logs').insert(
          validInventory.map((i) => ({
            closure_id: closureId,
            raw_material_id: matMap[i.materialCode],
            physical_closing_count: i.physicalClosingCount,
          }))
        );
      }
    }

    await supabase.from('audit_log').insert({
      closure_id: closureId,
      actor: payload.managerName,
      action: existing ? 'resubmit' : 'submit',
      detail: { notes: payload.notes },
    });

    const reportUrl = new URL('/api/reports/email', request.url);
    fetch(reportUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cron-secret': process.env.CRON_SECRET || '' },
      body: JSON.stringify({ closureId }),
    }).catch(console.error);

    return NextResponse.json({ success: true, closureId });
  } catch (err) {
    return NextResponse.json({ error: 'Child processing failed' }, { status: 500 });
  }
}