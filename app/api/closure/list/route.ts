import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();

    // 1. Fetch confirmed daily closures
    const { data: closures, error: closuresError } = await supabase
      .from('daily_closures')
      .select('*')
      .order('business_date', { ascending: false });

    if (closuresError) {
      console.error('Error fetching closures:', closuresError);
    }

    // 2. Fetch submission attempts so staff submissions are never hidden
    const { data: attempts, error: attemptsError } = await supabase
      .from('closure_submission_attempts')
      .select('*')
      .order('attempted_at', { ascending: false });

    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError);
    }

    // Map closures with their child details
    const closuresWithDetails = await Promise.all(
      (closures || []).map(async (c) => {
        const [expRes, advRes, invRes] = await Promise.all([
          supabase.from('expenses').select('*').eq('closure_id', c.id),
          supabase.from('staff_advances').select('*').eq('closure_id', c.id),
          supabase.from('inventory_logs').select('*, raw_materials(code, label_fr)').eq('closure_id', c.id)
        ]);

        return {
          ...c,
          expenses: expRes.data || c.expenses || [],
          staffAdvances: advRes.data || c.staff_advances || c.staffAdvances || [],
          inventory_logs: invRes.data || c.inventory || []
        };
      })
    );

    // 3. Bridge any submission attempts that didn't land in daily_closures directly onto the dashboard
    const existingDates = new Set(closuresWithDetails.map(c => c.business_date || c.businessDate));
    
    for (const att of (attempts || [])) {
      const attDate = att.closure_date || (att.attempted_data && (att.attempted_data.businessDate || att.attempted_data.business_date));
      if (attDate && !existingDates.has(attDate)) {
        const data = att.attempted_data || {};
        const grossRev = Number(data.grossRevenue || data.gross_revenue || 0);
        const expensesList = data.expenses || [];
        const totalExp = expensesList.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);

        closuresWithDetails.push({
          id: att.id || 'att-' + Math.random(),
          business_date: attDate,
          gross_revenue: grossRev,
          total_expenses: totalExp,
          net_cash: grossRev - totalExp,
          expenses: expensesList,
          staffAdvances: data.staffAdvances || data.staff_advances || [],
          inventory_logs: data.inventory || data.inventory_logs || [],
          notes: data.notes || 'Soumission en attente',
          submitted_at: att.attempted_at || new Date().toISOString()
        });
        existingDates.add(attDate);
      }
    }

    return NextResponse.json({ closures: closuresWithDetails });
  } catch (err: any) {
    console.error('Closure List API Error:', err);
    return NextResponse.json({ closures: [], error: err.message }, { status: 500 });
  }
}