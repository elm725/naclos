import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    
    const supabase = getSupabaseAdminClient();
    
    // Query the exact table name used in your submit route
    let query = supabase.from('closure_submission_attempts').select('*').order('created_at', { ascending: false });
    
    if (month) {
      query = query.like('closure_date', `${month}-%`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return NextResponse.json({ attempts: data || [] });
  } catch (err: any) {
    return NextResponse.json({ attempts: [] }, { status: 200 });
  }
}