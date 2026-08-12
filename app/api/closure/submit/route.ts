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

  const supabase = getSupabaseAdminClient();

  try {
    const { error: attemptError } = await supabase.from('closure_submission_attempts').insert({
      closure_date: payload.businessDate,
      submitted_by: payload.managerName,
      attempted_data: rawJson,
    });
    if (attemptError) console.error('Failed to log submission attempt:', attemptError);
  } catch (err) {
    console.error('Attempt logging threw:', err);
  }

  let existing: { id: string } | null = null;
  try {
    const { data, error } = await supabase
      .from('daily_closures')
      .select('id')
      .eq('business_date', payload.businessDate)
      .eq('store_id', payload.storeId)
      .maybeSingle();

    if (error) {
      console.error('Failed to check existing closure:', error);
      return NextResponse.json({ error: `Échec de vérification: ${error.message}` }, { status: 500 });
    }
    existing = data;

    if (existing) {
      const cleanupResults = await Promise.all([
        supabase.from('expenses').delete().eq('closure_id', existing.id),
        supabase.from('staff_advances').delete().eq('closure_id', existing.id),
        supabase.from('inventory_logs').delete().eq('closure_id', existing.id),
        supabase.from('menu_sales').delete().eq('closure_id', existing.id),
        supabase.from('report_deliveries').delete().eq('closure_id', existing.id),
        supabase.from('audit_log').delete().eq('closure_id', existing.id),
      ]);
      const cleanupFailure = cleanupResults.find((r) => r.error);
      if (cleanupFailure?.error) {
        console.error('Cleanup failed, aborting to avoid data loss:', cleanupFailure.error);
        return NextResponse.json({ error: `Échec du nettoyage: ${cleanupFailure.error.message}` }, { status: 500 });
      }

      const { error: deleteError } = await supabase.from('daily_closures').delete().eq('id', existing.id);
      if (deleteError) {
        console.error('Failed to delete old closure:', deleteError);
        return NextResponse.json({ error: `Échec de suppression: ${deleteError.message}` }, { status: 500 });
      }
    }
  } catch (err: any) {
    console.error('Existing-closure check/cleanup threw:', err);
    return NextResponse.json({ error: `Erreur inattendue: ${err.message}` }, { status: 500 });
  }

  const totals = computeClosureTotals(payload);

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
    console.error('Failed to save closure:', closureError);
    return NextResponse.json({ error: closureError?.message || 'Échec de sauvegarde de la clôture' }, { status: 500 });
  }

  const closureId = closure.id;

  try {
    if (payload.expenses.length > 0) {
      const validExpenses = payload.expenses.filter((e) => e.label && e.amount > 0);
      if (validExpenses.length > 0) {
        const { error } = await supabase.from('expenses').insert(
          validExpenses.map((e) => ({ closure_id: closureId, label: e.label, amount: e.amount }))
        );
        if (error) console.error('Expenses insert error:', error);
      }
    }

    if (payload.staffAdvances.length > 0) {
      const validAdvances = payload.staffAdvances.filter((a) => a.employeeName && a.amount > 0);
      if (validAdvances.length > 0) {
        const { error } = await supabase.from('staff_advances').insert(
          validAdvances.map((a) => ({ closure_id: closureId, employee_name: a.employeeName, amount: a.amount, note: a.note }))
        );
        if (error) console.error('Staff advances insert error:', error);
      }
    }

    if (payload.inventory.length > 0) {
      const { data: materials } = await supabase.from('raw_materials').select('id, code');
      const matMap = Object.fromEntries((materials || []).map((m: any) => [m.code, m.id]));
      const validInventory = payload.inventory.filter((i) => i.materialCode && matMap[i.materialCode]);

      if (validInventory.length > 0) {
        const { error } = await supabase.from('inventory_logs').insert(
          validInventory.map((i) => ({
            closure_id: closureId,
            raw_material_id: matMap[i.materialCode],
            physical_closing_count: i.physicalClosingCount,
          }))
        );
        if (error) console.error('Inventory logs insert error:', error);
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
  } catch (err: any) {
    console.error('Child processing failed:', err);
    return NextResponse.json({ error: err.message || 'Erreur lors du traitement des données associées' }, { status: 500 });
  }
}