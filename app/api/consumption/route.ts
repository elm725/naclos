import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const data = await request.json();

    const recordDate =
      data.businessDate || data.recordDate || new Date().toISOString().split('T')[0];

    // Clean overwrite if a record for this date already exists
    await supabase.from('daily_consumption_records').delete().eq('record_date', recordDate);

    const { error } = await supabase.from('daily_consumption_records').insert([
      {
        theoretical_dinde_kg: data.dindeKg,
        theoretical_vh_kg: data.vhKg,
        theoretical_mozzarella_kg: data.mozzKg,
        theoretical_crispy_pcs: data.crispyKg,
        theoretical_tortillas_pcs: data.totalTortillas,
        theoretical_buns_pcs: data.totalBurgers,
        record_date: recordDate,
      },
    ]);

    if (error) throw error;

    return NextResponse.json({ success: true, recordDate });
  } catch (error: any) {
    console.error('Error saving consumption:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // format: 'YYYY-MM'

    let query = supabase
      .from('daily_consumption_records')
      .select('*')
      .order('record_date', { ascending: false });

    if (month) {
      const [year, mon] = month.split('-').map(Number);
      const nextYear = mon === 12 ? year + 1 : year;
      const nextMon = mon === 12 ? 1 : mon + 1;
      const nextMonthStr = `${nextYear}-${String(nextMon).padStart(2, '0')}-01`;

      query = query.gte('record_date', `${month}-01`).lt('record_date', nextMonthStr);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ records: data || [] });
  } catch (error: any) {
    console.error('Error fetching consumption records:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}