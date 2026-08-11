import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';
import { generateDailyReportPdfBuffer } from '@/lib/pdfGenerator';
import { generateDailyExcelBuffer } from '@/lib/excelExport';
import { buildInventoryFlags } from '@/lib/calculations';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { closureId } = await request.json();
  if (!closureId) {
    return NextResponse.json({ error: 'closureId is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

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
    generateDailyExcelBuffer(closure),
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

async function loadFullClosureRecord(supabase: ReturnType<typeof getSupabaseAdminClient>, closureId: string): Promise<any> {
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

  return {
    id: closure.id,
    businessDate: closure.business_date,
    storeId: closure.store_id,
    managerName: closure.manager_name,
    grossRevenue: Number(closure.gross_revenue),
    totalExpenses: Number(closure.total_expenses),
    totalStaffAdvances: Number(closure.total_staff_advances || 0),
    netCash: Number(closure.net_cash),
    netProfit: Number(closure.net_profit || 0),
    notes: closure.notes || closure.discrepancy_summary || '',
    status: closure.status,
    receiptImageUrl: closure.receipt_image_url ?? null,
    hasInventoryDiscrepancy: closure.has_inventory_discrepancy,
    discrepancySummary: closure.discrepancy_summary,
    submittedAt: closure.submitted_at,
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
      openingStock: Number(i.opening_stock || 0),
      supplyPurchased: Number(i.supply_purchased || 0),
      consumedAmount: Number(i.consumed_amount || 0),
      physicalClosingCount: Number(i.physical_closing_count || 0),
      calculatedRemainingStock: Number(i.calculated_remaining_stock || 0),
      variance: Number(i.variance || 0),
      isFlagged: i.is_flagged,
    })),
  };
}

function buildEmailHtml(closure: any, flags: any[]): string {
  const currency = process.env.NEXT_PUBLIC_CURRENCY || 'MAD';
  const money = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`;

  const flagsHtml = flags.length
    ? `<div style="background:#fdecec;border-left:4px solid #d92d20;padding:14px 16px;border-radius:6px;margin:16px 0;">
         <strong style="color:#a3161a;">⚠ ${flags.length} écart(s) de stock détecté(s):</strong>
         <ul style="margin:8px 0 0 18px;color:#a3161a;">${flags.map((f: any) => `<li>${f.message}</li>`).join('')}</ul>
       </div>`
    : `<div style="background:#eafaf0;border-left:4px solid #12b76a;padding:14px 16px;border-radius:6px;margin:16px 0;color:#067647;">
         ✓ Aucun écart de stock détecté aujourd'hui.
       </div>`;

  const expensesHtml = closure.expenses && closure.expenses.length > 0
    ? `<table width="100%" style="border-collapse:collapse;margin-top:10px;font-size:13px;">
         <thead>
           <tr style="background:#f5f5f5;text-align:left;">
             <th style="padding:8px;border-bottom:1px solid #ddd;">Libellé</th>
             <th style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">Montant</th>
           </tr>
         </thead>
         <tbody>
           ${closure.expenses
             .map(
               (e: any) => `
             <tr>
               <td style="padding:8px;border-bottom:1px solid #eee;">${e.label}</td>
               <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;color:#d92d20;">${money(e.amount)}</td>
             </tr>`
             )
             .join('')}
         </tbody>
       </table>`
    : `<p style="font-size:13px;color:#777;font-style:italic;">Aucune dépense enregistrée aujourd'hui.</p>`;

  const stockHtml = closure.inventory && closure.inventory.length > 0
    ? `<table width="100%" style="border-collapse:collapse;margin-top:10px;font-size:13px;">
         <thead>
           <tr style="background:#f5f5f5;text-align:left;">
             <th style="padding:8px;border-bottom:1px solid #ddd;">Article</th>
             <th style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">Stock Réel Compté</th>
           </tr>
         </thead>
         <tbody>
           ${closure.inventory
             .map(
               (i: any) => `
             <tr>
               <td style="padding:8px;border-bottom:1px solid #eee;">${i.materialLabel || i.materialCode || 'Article'}</td>
               <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">${i.physicalClosingCount} ${i.unit || ''}</td>
             </tr>`
             )
             .join('')}
         </tbody>
       </table>`
    : `<p style="font-size:13px;color:#777;font-style:italic;">Aucune donnée de stock enregistrée.</p>`;

  const notesHtml = closure.notes
    ? `<div style="background:#fffbe0;border-left:4px solid #f59e0b;padding:12px;border-radius:6px;margin:20px 0;">
         <strong style="color:#92400e;font-size:12px;text-transform:uppercase;">Note / Remarque:</strong>
         <p style="margin:4px 0 0 0;color:#78350f;font-size:13px;font-style:italic;">"${closure.notes}"</p>
       </div>`
    : '';

  const receiptHtml = closure.receiptImageUrl
    ? `<div style="margin-top:20px;">
         <h3 style="font-size:14px;border-bottom:1px solid #eee;padding-bottom:6px;margin-bottom:10px;">Justificatif / Reçu Image</h3>
         <div style="text-align:center;">
           <img src="${closure.receiptImageUrl}" alt="Reçu" style="max-width:100%;max-height:400px;border:1px solid #ddd;border-radius:6px;" /><br/>
           <a href="${closure.receiptImageUrl}" target="_blank" style="font-size:12px;color:#2563eb;display:inline-block;margin-top:6px;">Ouvrir l'image en pleine définition</a>
         </div>
       </div>`
    : '';

  return `
  <div style="font-family:Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;border:1px solid #e5e7eb;padding:20px;border-radius:8px;">
    <h2 style="margin-bottom:4px;color:#111;">Naclos Operations & Audit Portal</h2>
    <p style="color:#666;margin-top:0;font-size:14px;">Rapport de clôture — <strong>${closure.businessDate}</strong> · Responsable: <strong>${closure.managerName}</strong></p>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;text-align:center;">
      <tr>
        <td style="padding:10px;background:#f9fafb;border:1px solid #f3f4f6;">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;">Revenu Brut</div>
          <div style="font-size:16px;font-weight:700;color:#16a34a;">${money(closure.grossRevenue)}</div>
        </td>
        <td style="padding:10px;background:#f9fafb;border:1px solid #f3f4f6;">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;">Dépenses</div>
          <div style="font-size:16px;font-weight:700;color:#dc2626;">${money(closure.totalExpenses)}</div>
        </td>
        <td style="padding:10px;background:#f9fafb;border:1px solid #f3f4f6;">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;">Cash Net</div>
          <div style="font-size:16px;font-weight:700;color:#111827;">${money(closure.netCash)}</div>
        </td>
      </tr>
    </table>

    ${flagsHtml}
    ${notesHtml}

    <h3 style="font-size:14px;border-bottom:1px solid #eee;padding-bottom:6px;margin-top:24px;margin-bottom:8px;">Détail des Dépenses</h3>
    ${expensesHtml}

    <h3 style="font-size:14px;border-bottom:1px solid #eee;padding-bottom:6px;margin-top:24px;margin-bottom:8px;">État du Stock Réel</h3>
    ${stockHtml}

    ${receiptHtml}

    <p style="color:#999;font-size:11px;margin-top:32px;border-top:1px solid #f3f4f6;padding-top:12px;">
      Le rapport PDF détaillé et le fichier Excel récapitulatif sont joints à cet email. Généré automatiquement.
    </p>
  </div>`;
}