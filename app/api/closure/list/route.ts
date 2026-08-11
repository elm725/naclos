import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();

    // Fetch all closures AND their connected expenses, advances, and stock codes
    const { data, error } = await supabase
      .from('daily_closures')
      .select(`
        *,
        expenses (*),
        staff_advances (*),
        inventory_logs (
          *,
          raw_materials (code)
        )
      `)
      .order('business_date', { ascending: false });

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ closures: data });
  } catch (err: any) {
    console.error('Erreur API:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}