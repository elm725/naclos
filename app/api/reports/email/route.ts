import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';

const resend = new Resend(process.env.RESEND_API_KEY);

const TRACKED_COLUMNS = [
  { id: 'dinde', label: 'DINDE', isKg: true, match: ['dinde'] },
  { id: 'vh', label: 'VH', isKg: true, match: ['vh', 'viande hachée'] },
  { id: 'mozz', label: 'MOZZ', isKg: true, match: ['mozzarella', 'mozarella'] },
  { id: 'crispy', label: 'CRISPY', isKg: true, match: ['crispy', 'crispy_chicken'] },
  { id: 'tortilla', label: 'TORTILLA', isKg: false, match: ['tortilla'] },
  { id: 'burger', label: 'BURGER', isKg: false, match: ['burger', 'burger_buns'] },
  { id: 'soda', label: 'SODA', isKg: false, match: ['soda', 'soda_cans'] },
  { id: 'eau_p', label: 'EAU P', isKg: false, match: ['eau_p', 'eau_petite'] },
  { id: 'eau_g', label: 'EAU G', isKg: false, match: ['eau_g', 'eau_grande'] }
];

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

  // 1. Fetch current closure
  const closure = await loadFullClosureRecord(supabase, closureId);
  if (!closure) {
    return NextResponse.json({ error: 'Closure not found' }, { status: 404 });
  }

  // 2. Fetch PREVIOUS closure (for Opening Stock)
  const { data: prevClosures } = await supabase
    .from('daily_closures')
    .select('id')
    .lt('business_date', closure.businessDate)
    .order('business_date', { ascending: false })
    .limit(1);

  let prevClosure = null;
  if (prevClosures && prevClosures.length > 0) {
    prevClosure = await loadFullClosureRecord(supabase, prevClosures[0].id);
  }

  // 3. Fetch current day's supplies (Alimentation)
  const { data: currentSupply } = await supabase
    .from('supply_purchases')
    .select('*')
    .eq('business_date', closure.businessDate)
    .maybeSingle();

  const recipients = [process.env.REPORT_RECIPIENT_OWNER, process.env.REPORT_RECIPIENT_PARTNER].filter(
    (r): r is string => Boolean(r)
  );

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'No recipient emails configured' }, { status: 500 });
  }

  try {
    // We send the new HTML layout and remove the old attachments for now
    await resend.emails.send({
      from: process.env.REPORT_SENDER_EMAIL || 'Naclos Operations <reports@naclos.ma>',
      to: recipients,
      subject: `Rapport Journalier Naclos — ${closure.businessDate}`,
      html: buildEmailHtml(closure, prevClosure, currentSupply),
    });

    await supabase.from('report_deliveries').insert({
      closure_id: closureId,
      recipients,
      status: 'sent',
    });

    return NextResponse.json({ success: true, recipients });
  } catch (err) {
    console.error('Email send error:', err);
    return NextResponse.json({ error: 'Failed to send report email', details: String(err) }, { status: 500 });
  }
}

async function loadFullClosureRecord(supabase: any, closureId: string): Promise<any> {
  const { data: closure } = await supabase.from('daily_closures').select('*').eq('id', closureId).single();
  if (!closure) return null;

  const { data: expenses } = await supabase.from('expenses').select('label, amount').eq('closure_id', closureId);
  const { data: advances } = await supabase.from('staff_advances').select('employee_name, amount').eq('closure_id', closureId);
  const { data: inventory } = await supabase.from('inventory_logs').select('physical_closing_count, raw_materials(code)').eq('closure_id', closureId);

  return {
    businessDate: closure.business_date,
    grossRevenue: Number(closure.gross_revenue || 0),
    totalExpenses: Number(closure.total_expenses || 0),
    netProfit: Number(closure.gross_revenue || 0) - Number(closure.total_expenses || 0),
    expenses: expenses || [],
    staffAdvances: advances || [],
    inventory: inventory || []
  };
}

// SMART GETTERS
function getStockValue(targetClosure: any, column: any) {
  if (!targetClosure || !targetClosure.inventory) return 0;
  const inv = targetClosure.inventory.find((i: any) => column.match.includes((i.raw_materials?.code || '').toLowerCase()));
  let val = Number(inv?.physical_closing_count || 0);
  if (column.isKg && val > 20) val = val / 1000;
  return val;
}

function getSupplyValue(currentSupply: any, column: any) {
  if (!currentSupply || !currentSupply.items) return 0;
  const item = currentSupply.items.find((i: any) => column.match.includes((i.code || '').toLowerCase()));
  return Number(item?.quantity || 0);
}

function formatNum(num: number) {
  return num === 0 ? '0' : Number(num.toFixed(3)).toLocaleString('fr-FR');
}

// HTML EMAIL GENERATOR (Matches the Grid perfectly)
function buildEmailHtml(closure: any, prevClosure: any, currentSupply: any): string {
  const tableHeader = TRACKED_COLUMNS.map(c => `<th style="border: 1px solid #000; background: #104e7a; color: white; padding: 6px; font-size: 11px;">${c.label}</th>`).join('');
  
  const stockCells = TRACKED_COLUMNS.map(c => `<td style="border: 1px solid #000; font-weight: bold; text-align: center; padding: 6px;">${formatNum(getStockValue(prevClosure, c))}</td>`).join('');
  const supplyCells = TRACKED_COLUMNS.map(c => `<td style="border: 1px solid #000; font-weight: bold; text-align: center; padding: 6px;">${formatNum(getSupplyValue(currentSupply, c))}</td>`).join('');
  
  const consumedCells = TRACKED_COLUMNS.map(c => {
    const consumed = getStockValue(prevClosure, c) + getSupplyValue(currentSupply, c) - getStockValue(closure, c);
    return `<td style="border: 1px solid #000; font-weight: bold; text-align: center; padding: 6px; color: #b91c1c; background: #fef2f2;">${formatNum(consumed)}</td>`;
  }).join('');
  
  const resteCells = TRACKED_COLUMNS.map(c => `<td style="border: 1px solid #000; font-weight: bold; text-align: center; padding: 6px; background: #f3f4f6;">${formatNum(getStockValue(closure, c))}</td>`).join('');

  const expensesHtml = closure.expenses.length > 0 
    ? closure.expenses.map((e: any) => `
        <tr>
          <td style="border: 1px solid #000; background: #f4a261; font-weight: bold; padding: 4px 8px; font-size: 12px; text-transform: capitalize;">${e.label}</td>
          <td style="border: 1px solid #000; text-align: center; font-weight: bold; padding: 4px 8px; font-size: 12px;">${e.amount}</td>
        </tr>`).join('')
    : `<tr><td colspan="2" style="border: 1px solid #000; text-align: center; padding: 4px; font-style: italic;">Aucune dépense</td></tr>`;

  const advancesHtml = closure.staffAdvances.length > 0
    ? `<div style="margin-top: 10px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #4b5563; text-align: center;">
        ${closure.staffAdvances.map((a: any) => `Avance ${a.employee_name} ${a.amount} DH`).join(' - ')}
       </div>`
    : '';

  return `
  <div style="font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; color: #000;">
    <h2 style="text-align: center; margin-bottom: 20px;">Rapport de Clôture - ${closure.businessDate}</h2>

    <!-- TOP STOCK TABLE -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr>
          <th style="border: 1px solid #000; background: #104e7a; width: 120px;"></th>
          ${tableHeader}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #000; background: #104e7a; color: white; font-weight: bold; padding: 6px;">STOCK</td>
          ${stockCells}
        </tr>
        <tr>
          <td style="border: 1px solid #000; background: #104e7a; color: white; font-weight: bold; padding: 6px;">ALIMENTATION</td>
          ${supplyCells}
        </tr>
      </tbody>
    </table>

    <!-- MIDDLE SECTION -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: none;">
      <tr>
        <!-- REVENUE -->
        <td style="width: 30%; vertical-align: top; border: none; padding-right: 15px;">
          <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
            <tr>
              <td style="background: #fff200; font-weight: bold; text-align: center; padding: 15px; font-size: 14px;">TOTALE REVENUE</td>
              <td style="background: #fff200; font-weight: bold; text-align: center; padding: 15px; border-left: 2px solid #000; font-size: 18px;">${closure.grossRevenue}</td>
            </tr>
          </table>
        </td>

        <!-- DEPENSES -->
        <td style="width: 40%; vertical-align: top; border: none; padding-right: 15px;">
          <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
            <tr>
              <td style="background: #e31818; color: white; font-weight: bold; text-align: center; font-size: 20px; width: 40px; writing-mode: vertical-rl;">DEPENSE</td>
              <td style="padding: 0; vertical-align: top;">
                <table style="width: 100%; border-collapse: collapse;">
                  ${expensesHtml}
                  <tr>
                    <td style="border: 1px solid #000; background: #fff200; font-weight: 900; padding: 6px; text-align: center;">TOTAL</td>
                    <td style="border: 1px solid #000; background: #fff200; font-weight: 900; padding: 6px; text-align: center;">${closure.totalExpenses}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>

        <!-- NET -->
        <td style="width: 30%; vertical-align: top; border: none; padding-top: 30px;">
          <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
            <tr>
              <td style="background: #fff200; font-weight: 900; text-align: center; padding: 10px; font-size: 16px;">NET</td>
              <td style="font-weight: 900; text-align: center; padding: 10px; border-left: 2px solid #000; font-size: 16px;">${closure.netProfit}</td>
            </tr>
          </table>
          ${advancesHtml}
        </td>
      </tr>
    </table>

    <!-- BOTTOM INVENTORY TABLE -->
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="border: 1px solid #000; background: #104e7a; width: 120px;"></th>
          ${tableHeader}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #000; background: #104e7a; color: white; font-weight: bold; padding: 6px;">CONSOMMATION</td>
          ${consumedCells}
        </tr>
        <tr>
          <td style="border: 1px solid #000; background: #104e7a; color: white; font-weight: bold; padding: 6px;">RESTE</td>
          ${resteCells}
        </tr>
      </tbody>
    </table>
  </div>
  `;
}