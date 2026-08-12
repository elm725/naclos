import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';
import { monthRange } from '@/lib/dateRange';

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
      const { start, end } = monthRange(month);
      query = query.gte('business_date', start).lt('business_date', end);
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

    // Temporary debug return to check the project URL
    return NextResponse.json({ 
      debug: 'Check me!', 
      project_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      closures: closuresWithDetails 
    });
  } catch (err: any) {
    console.error('Closure List API Error:', err);
    return NextResponse.json({ closures: [], error: err.message }, { status: 500 });
  }
}