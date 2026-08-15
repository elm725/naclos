import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    
    // Fetch closures AND all related child tables in a single, lightning-fast database trip
    const { data: closures, error: closuresError } = await supabase
      .from('daily_closures')
      .select(`
        *,
        expenses (*),
        staff_advances (*),
        inventory_logs (*, raw_materials(code, label_fr))
      `)
      .order('business_date', { ascending: false })
      .limit(31);

    if (closuresError) throw closuresError;

    return NextResponse.json({ closures }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (err: any) {
    console.error('API /closure/list ERROR:', err);
    return NextResponse.json({ closures: [], error: err.message }, { status: 500 });
  }
}