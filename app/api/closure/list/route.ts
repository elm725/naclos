import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from('daily_closures')
      .select('*')
      .order('business_date', { ascending: false });

    if (month) {
      const [yearStr, monthStrNum] = month.split('-');
      const year = parseInt(yearStr, 10);
      const m = parseInt(monthStrNum, 10);
      const startDate = `${year}-${String(m).padStart(2, '0')}-01`;
      
      let nextYear = year;
      let nextMonth = m + 1;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
      }
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

      query = query.gte('business_date', startDate).lt('business_date', endDate);
    }

    const { data: closures, error } = await query;

    if (error) {
      console.error('Error listing closures:', error);
      return NextResponse.json({ closures: [], error: error.message }, { status: 500 });
    }

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

    return NextResponse.json({ closures: closuresWithDetails });
  } catch (err: any) {
    console.error('Closure List API Error:', err);
    return NextResponse.json({ closures: [], error: err.message }, { status: 500 });
  }
}