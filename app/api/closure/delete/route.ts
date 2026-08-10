import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Date field is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    // 1. Set status to draft so lock triggers allow the delete
    await supabase
      .from('daily_closures')
      .update({ status: 'draft' })
      .eq('business_date', date);

    // 2. Delete parent closure (cascades to all child tables)
    const { error } = await supabase
      .from('daily_closures')
      .delete()
      .eq('business_date', date);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Clôture supprimée avec succès.' });
  } catch (err: any) {
    console.error('Delete Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}