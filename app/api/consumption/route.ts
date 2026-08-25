import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { monthRange } from '@/lib/Daterange';
export const dynamic = 'force-dynamic'; // <-- ADD THIS LINE



// Initialize Supabase client for the server route
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Grab the specific date Salem chose on the frontend
    const targetDate = data.businessDate;

    if (!targetDate) {
      return NextResponse.json({ error: 'La date (businessDate) est requise.' }, { status: 400 });
    }

    // 1. Delete existing record for this specific date to allow overwriting mistakes
    await supabase
      .from('daily_consumption_records')
      .delete()
      .eq('record_date', targetDate);

    // 2. Insert the updated consumption data
    const { error } = await supabase
      .from('daily_consumption_records')
      .insert([
        {
          theoretical_dinde_kg: data.dindeKg,
          theoretical_vh_kg: data.vhKg,
          theoretical_mozzarella_kg: data.mozzKg,
          theoretical_crispy_pcs: data.crispyKg, 
          theoretical_tortillas_pcs: data.totalTortillas,
          theoretical_buns_pcs: data.totalBurgers,
          record_date: targetDate, // Force the database to use Salem's selected date
        }
      ]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving consumption:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    let query = supabase.from('daily_consumption_records').select('*').order('record_date', { ascending: false });

    if (month) {
      const { start, end } = monthRange(month);   // CHANGED
      query = query.gte('record_date', start).lt('record_date', end); // CHANGED
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ records: data || [] });
  } catch (error: any) {
    console.error('Error fetching consumption records:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
