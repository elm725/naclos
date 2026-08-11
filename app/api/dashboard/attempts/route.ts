import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  
  const supabase = getSupabaseAdminClient();
  
  let query = supabase
    .from('closure_submission_attempts')
    .select('id, closure_date, submitted_by, attempted_data, created_at')
    .order('created_at', { ascending: false });
  
  if (month) {
    query = query.like('closure_date', `${month}-%`);
  }

  const { data, error } = await query;
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ attempts: data });
}