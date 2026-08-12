import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(request: NextRequest) {
  try {
    // 🚨 THIS IS THE FIX: Actively reading the URL forces Vercel to bypass the static cache
    const url = new URL(request.url);
    const timestamp = url.searchParams.get('_t'); 
    
    const supabase = getSupabaseAdminClient();
    
    const { data, error } = await supabase
      .from('closure_submission_attempts')
      .select('*')
      .order('attempted_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ attempts: data || [] }, { headers: noStoreHeaders });
  } catch (err: any) {
    console.error('Attempts API Error:', err);
    return NextResponse.json({ attempts: [], error: err.message }, { status: 500, headers: noStoreHeaders });
  }
}