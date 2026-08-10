import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const fileExt = file.name.split('.').pop();
    const fileName = `receipt_${Date.now()}.${fileExt}`;
    const filePath = `daily-closures/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);

    return NextResponse.json({ publicUrl: data.publicUrl });
  } catch (err: any) {
    console.error('Upload route error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}