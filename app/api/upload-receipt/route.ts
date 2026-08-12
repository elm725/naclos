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

    const supabase = getSupabaseAdminClient();

    // 1. Absolute safety check for filename
    const rawName = file.name || `receipt_${Date.now()}.png`;

    // 2. Strip all accents, spaces, and dangerous characters completely
    const cleanName = rawName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_');

    // 3. Guarantee a clean relative path with NO leading slash and NO double slashes
    const filePath = `receipts/${Date.now()}_${cleanName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(filePath, buffer, {
        contentType: file.type || 'image/png',
        upsert: true,
      });

    if (error) {
      console.error('Supabase Storage Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 5. Retrieve Public URL safely
    const { data: publicUrlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (err: any) {
    console.error('Upload Route Error:', err);
    return NextResponse.json({ error: err.message || 'Erreur interne' }, { status: 500 });
  }
}