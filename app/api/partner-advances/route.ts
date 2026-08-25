import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';
import { monthRange } from '@/lib/Daterange';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const supabase = getSupabaseAdminClient();

    let query = supabase.from('partner_advances').select('*').order('advance_date', { ascending: false });
    if (month) {
      const { start, end } = monthRange(month);
      query = query.gte('advance_date', start).lt('advance_date', end);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ advances: data || [] });
  } catch (err: any) {
    return NextResponse.json({ advances: [], error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    if (!payload.partnerName || !payload.amount || !payload.advanceDate) {
      return NextResponse.json({ error: 'partnerName, amount et advanceDate sont requis.' }, { status: 400 });
    }
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from('partner_advances').insert({
      partner_name: payload.partnerName,
      amount: Number(payload.amount),
      advance_date: payload.advanceDate,
      note: payload.note || null,
    });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from('partner_advances').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}