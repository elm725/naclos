import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    
    const { data, error } = await supabase
      .from('supply_purchases')
      .select('*')
      .order('business_date', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ supplies: data || [] }, { headers: noStoreHeaders });
  } catch (err: any) {
    console.error('Supply GET Error:', err);
    return NextResponse.json({ supplies: [], error: err.message }, { status: 500, headers: noStoreHeaders });
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

    // --- SMART EMAIL TRIGGER ---
    // Check if Tayeb already submitted a closure for this date
    const { data: existingClosure } = await supabase
      .from('daily_closures')
      .select('id')
      .eq('business_date', payload.businessDate)
      .maybeSingle();

    if (existingClosure) {
      // Tayeb submitted first, so Salem is the second one. Trigger the email!
      await supabase.from('report_deliveries').delete().eq('closure_id', existingClosure.id);
      
      const reportUrl = new URL('/api/reports/email', request.url);
      await fetch(reportUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': process.env.CRON_SECRET || '' },
        body: JSON.stringify({ closureId: existingClosure.id }),
      }).catch(console.error);
    } else {
      console.log("Closure not yet submitted. Waiting for mohamed to trigger the email.");
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Supabase Supply Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur interne.' }, { status: 500 });
  }
}