import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    
    const supabase = getSupabaseAdminClient();
    let query = supabase.from('closure_submission_attempts').select('*').order('created_at', { ascending: false });
    
    if (month) {
      query = query.like('closure_date', `${month}-%`);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching attempts:', error);
      return NextResponse.json({ attempts: [], error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ attempts: data || [] });
  } catch (err: any) {
    console.error('Attempts API Error:', err);
    return NextResponse.json({ attempts: [], error: err.message }, { status: 500 });
  }
}