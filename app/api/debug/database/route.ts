import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient, getSupabaseProjectRef } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  Pragma: 'no-cache',
  Expires: '0',
};

function isAuthorized(request: NextRequest): boolean {
  const configuredSecret = process.env.ADMIN_UNLOCK_SECRET?.trim();

  if (!configuredSecret) {
    return false;
  }

  const providedSecret =
    request.headers.get('x-admin-secret') || new URL(request.url).searchParams.get('secret');

  return providedSecret === configuredSecret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders });
  }

  try {
    const supabase = getSupabaseAdminClient();

    const [closuresCount, attemptsCount, latestClosures, latestAttempts] = await Promise.all([
      supabase.from('daily_closures').select('id', { count: 'exact', head: true }),
      supabase.from('closure_submission_attempts').select('id', { count: 'exact', head: true }),
      supabase
        .from('daily_closures')
        .select('id,business_date,manager_name,gross_revenue,submitted_at,created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('closure_submission_attempts')
        .select('id,closure_date,submitted_by,attempted_at')
        .order('attempted_at', { ascending: false })
        .limit(5),
    ]);

    const errors = [closuresCount.error, attemptsCount.error, latestClosures.error, latestAttempts.error].filter(Boolean);

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: errors.map((error) => error?.message).join(' | '),
          projectRef: getSupabaseProjectRef(),
          checkedAt: new Date().toISOString(),
        },
        { status: 500, headers: noStoreHeaders }
      );
    }

    return NextResponse.json(
      {
        projectRef: getSupabaseProjectRef(),
        checkedAt: new Date().toISOString(),
        counts: {
          dailyClosures: closuresCount.count ?? 0,
          submissionAttempts: attemptsCount.count ?? 0,
        },
        latestClosures: latestClosures.data || [],
        latestAttempts: latestAttempts.data || [],
      },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message || 'Database debug check failed.',
        projectRef: getSupabaseProjectRef(),
        checkedAt: new Date().toISOString(),
      },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
