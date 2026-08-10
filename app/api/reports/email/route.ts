import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';
import { generateDailyReportPdfBuffer } from '@/lib/pdfGenerator';
import { generateDailyExcelBuffer } from '@/lib/excelExport';
import { buildInventoryFlags } from '@/lib/calculations';
import type { DailyClosureRecord } from '@/types';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  // Protect this route: only the internal submit flow or an authenticated cron may call it.
  const cronSecret = request.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { closureId } = await request.json();
  if (!closureId) {
    return NextResponse.json({ error: 'closureId is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  // Avoid double-sending if this closure's report already went out.
  const { data: alreadySent } = await supabase
    .from('report_deliveries')
    .select('id')
    .eq('closure_id', closureId)
    .maybeSingle();
  if (alreadySent) {
    return NextResponse.json({ success: true, skipped: true, reason: 'Report already sent for this closure.' });
  }

  const closure = await loadFullClosureRecord(supabase, closureId);
  if (!closure) {
    return NextResponse.json({ error: 'Closure not found' }, { status: 404 });
  }

  const inventoryFlags = buildInventoryFlags(closure.inventory);

  const [pdfBuffer, xlsxBuffer] = await Promise.all([
    generateDailyReportPdfBuffer(closure, inventoryFlags),
    generateDailyExcelBuffer(closure), // pass an existing monthly workbook buffer here to append instead of starting fresh
  ]);

  const recipients = [process.env.REPORT_RECIPIENT_OWNER, process.env.REPORT_RECIPIENT_PARTNER].filter(
    (r): r is string => Boolean(r)
  );

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'No recipient emails configured' }, { status: 500 });
  }

  try {
    await resend.emails.send({
      from: process.env.REPORT_SENDER_EMAIL || 'Naclos Operations <reports@naclos.ma>',
      to: recipients,
      subject: `Rapport Journalier Naclos — ${closure.businessDate}${inventoryFlags.length ? ' ⚠ Écarts de Stock' : ''}`,
      html: buildEmailHtml(closure, inventoryFlags),
      attachments: [
        { filename: `Naclos_Rapport_${closure.businessDate}.pdf`, content: pdfBuffer },
        { filename: `Naclos_Resume_${closure.businessDate}.xlsx`, content: xlsxBuffer },
      ],
    });

    await supabase.from('report_deliveries').insert({
      closure_id: closureId,
      recipients,
      status: 'sent',
    });
    await supabase.from('audit_log').insert({
      closure_id: closureId,
      actor: 'system',
      action: 'email_sent',
      detail: { recipients },
    });

    return NextResponse.json({ success: true, recipients });
  } catch (err) {
    await supabase.from('report_deliveries').insert({
      closure_id: closureId,
      recipients,
      status: 'failed',
      error_message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Failed to send report email', details: String(err) }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Data loading: reassembles the flat record shape used by the PDF/Excel builders
// ---------------------------------------------------------------------------
async function loadFullClosureRecord(supabase: ReturnType<typeof getSupabaseAdminClient>, closureId: string): Promise<DailyClosureRecord | null> {
  const { data: closure } = await supabase.from('daily_closures').select('*').eq('id', closureId).single();
  if (!closure) return null;

  const { data: expenses } = await supabase
    .from('expenses')
    .select('label, amount, expense_categories(code)')
    .eq('closure_id', closureId);

  const { data: advances } = await supabase.from('staff_advances').select('employee_name, amount, note').eq('closure_id', closureId);

  const { data: inventory } = await supabase
    .from('inventory_logs')
    .select('opening_stock, supply_purchased, consumed_amount, physical_closing_count, calculated_remaining_stock, variance, is_flagged, raw_materials(code, label_fr, unit)')
    .eq('closure_id', closureId);

  const { data: sales } = await supabase
    .from('menu_sales')
    .select('quantity_sold, menu_items(code, label_fr, menu_categories(code))')
    .eq('closure_id', closureId);

  return {
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
    submittedAt: closure.submitted_at,
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
      materialLabel: i.raw_materials?.label_fr,
      unit: i.raw_materials?.unit,
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
      itemLabel: s.menu_items?.label_fr || '',
      quantitySold: s.quantity_sold,
    })),
  };
}

function buildEmailHtml(closure: DailyClosureRecord, flags: ReturnType<typeof buildInventoryFlags>): string {
  const currency = process.env.NEXT_PUBLIC_CURRENCY || 'MAD';
  const money = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`;

  const flagsHtml = flags.length
    ? `<div style="background:#fdecec;border-left:4px solid #d92d20;padding:14px 16px;border-radius:6px;margin:16px 0;">
         <strong style="color:#a3161a;">⚠ ${flags.length} écart(s) de stock détecté(s):</strong>
         <ul style="margin:8px 0 0 18px;color:#a3161a;">${flags.map((f) => `<li>${f.message}</li>`).join('')}</ul>
       </div>`
    : `<div style="background:#eafaf0;border-left:4px solid #12b76a;padding:14px 16px;border-radius:6px;margin:16px 0;color:#067647;">
         ✓ Aucun écart de stock détecté aujourd'hui.
       </div>`;

  return `
  <div style="font-family:Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
    <h2 style="margin-bottom:4px;">Naclos Operations & Audit Portal</h2>
    <p style="color:#666;margin-top:0;">Rapport de clôture — ${closure.businessDate} · Responsable: ${closure.managerName}</p>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr>
        <td style="padding:10px;background:#f5f5f5;border-radius:4px 0 0 4px;">
          <div style="font-size:11px;color:#666;">Revenu Brut</div>
          <div style="font-size:16px;font-weight:700;">${money(closure.grossRevenue)}</div>
        </td>
        <td style="padding:10px;background:#f5f5f5;">
          <div style="font-size:11px;color:#666;">Dépenses</div>
          <div style="font-size:16px;font-weight:700;">${money(closure.totalExpenses)}</div>
        </td>
        <td style="padding:10px;background:#f5f5f5;">
          <div style="font-size:11px;color:#666;">Avances</div>
          <div style="font-size:16px;font-weight:700;">${money(closure.totalStaffAdvances)}</div>
        </td>
        <td style="padding:10px;background:#f5f5f5;border-radius:0 4px 4px 0;">
          <div style="font-size:11px;color:#666;">Cash Net</div>
          <div style="font-size:16px;font-weight:700;">${money(closure.netCash)}</div>
        </td>
      </tr>
    </table>

    ${flagsHtml}

    <p>Le rapport PDF détaillé et le fichier Excel récapitulatif sont joints à cet email.</p>
    <p style="color:#999;font-size:11px;margin-top:32px;">Généré automatiquement — ne pas répondre à cet email.</p>
  </div>`;
}
