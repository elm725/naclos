import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';

// 1. Force Vercel to disable all caching layers for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    // 2. Explicitly read the search parameter so Vercel knows this is a dynamic request
    const _t = request.nextUrl.searchParams.get('_t');

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

    // 3. Send bulletproof cache-busting headers back to the client
    return NextResponse.json({ closures: closuresWithDetails }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (err: any) {
    return NextResponse.json({ closures: [], error: err.message }, { status: 500 });
  }
}