import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    
    const { data: closures, error: closuresError } = await supabase
      .from('daily_closures')
      .select('*')
      .order('business_date', { ascending: false });

    if (closuresError) throw closuresError;

    const closuresWithDetails = await Promise.all(
      (closures || []).map(async (c) => {
        const [expRes, advRes, invRes] = await Promise.all([
          supabase.from('expenses').select('*').eq('closure_id', c.id),
          supabase.from('staff_advances').select('*').eq('closure_id', c.id),
          supabase.from('inventory_logs').select('*, raw_materials(code, label_fr)').eq('closure_id', c.id)
        ]);

        return {
          ...c,
          expenses: expRes.data || [],
          staffAdvances: advRes.data || [],
          inventory_logs: invRes.data || []
        };
      })
    );

    return NextResponse.json({ closures: closuresWithDetails }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (err: any) {
    return NextResponse.json({ closures: [], error: err.message }, { status: 500 });
  }
}