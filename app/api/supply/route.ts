import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';
import { monthRange } from '@/lib/Daterange';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    const supabase = getSupabaseAdminClient();
    let query = supabase.from('supply_purchases').select('*').order('business_date', { ascending: false });

    if (month) {
      const { start, end } = monthRange(month);
      query = query.gte('business_date', start).lt('business_date', end);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching supplies:', error);
      return NextResponse.json({ supplies: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ supplies: data || [] });
  } catch (err: any) {
    console.error('Supply GET Error:', err);
    return NextResponse.json({ supplies: [], error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const supabase = getSupabaseAdminClient();

    if (!payload.businessDate || !payload.items) {
      return NextResponse.json({ error: 'Données de formulaire incomplètes.' }, { status: 400 });
    }

    await supabase.from('supply_purchases').delete().eq('business_date', payload.businessDate);

    const { error } = await supabase.from('supply_purchases').insert({
      business_date: payload.businessDate,
      buyer_name: payload.buyerName || 'Salem',
      items: payload.items,
      submitted_at: new Date().toISOString()
    });

    if (error) {
      console.error('Supply Insert Error:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Supabase Supply Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur interne.' }, { status: 500 });
  }
}