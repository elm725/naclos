import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 });
    }

    const extension = file.name.split('.').pop() || 'png';
    const filePath = `${Date.now()}_receipt.${extension}`;

    // Convert Web File to Node Buffer (Required for Vercel/Supabase Server-Side Uploads)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = getSupabaseAdminClient();

    const { error } = await supabase.storage
      .from('receipts')
      .upload(filePath, buffer, {
        contentType: file.type || 'image/png',
        upsert: true,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}