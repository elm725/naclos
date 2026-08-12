import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    
    const { data, error } = await supabase
      .from('closure_submission_attempts')
      .select('*')
      .order('attempted_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ attempts: data || [] }, {
      headers: { 
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (err: any) {
    console.error('Attempts API Error:', err);
    return NextResponse.json({ attempts: [] });
  }
}