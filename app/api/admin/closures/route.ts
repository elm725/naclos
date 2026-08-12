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

function parseBusinessDates(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((date): date is string => typeof date === 'string')
    .map((date) => date.trim())
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const businessDates = parseBusinessDates(body.businessDates);

    if (businessDates.length === 0) {
      return NextResponse.json(
        { error: 'Provide businessDates as an array of YYYY-MM-DD strings.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data: matchingClosures, error: lookupError } = await supabase
      .from('daily_closures')
      .select('id,business_date,manager_name,gross_revenue,created_at')
      .in('business_date', businessDates);

    if (lookupError) {
      throw lookupError;
    }

    if (!matchingClosures || matchingClosures.length === 0) {
      return NextResponse.json(
        {
          success: true,
          deletedCount: 0,
          deletedClosures: [],
          projectRef: getSupabaseProjectRef(),
        },
        { headers: noStoreHeaders }
      );
    }

    await supabase
      .from('daily_closures')
      .update({ status: 'draft' })
      .in('id', matchingClosures.map((closure) => closure.id));

    const { error: deleteError } = await supabase
      .from('daily_closures')
      .delete()
      .in('id', matchingClosures.map((closure) => closure.id));

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json(
      {
        success: true,
        deletedCount: matchingClosures.length,
        deletedClosures: matchingClosures,
        projectRef: getSupabaseProjectRef(),
      },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Admin closure delete failed:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to delete closures.', projectRef: getSupabaseProjectRef() },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
