import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RECEIPTS_BUCKET = 'receipts';
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

function getReceiptExtension(file: File): string {
  if (file.type && MIME_EXTENSION[file.type]) {
    return MIME_EXTENSION[file.type];
  }

  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return extension && extension.length <= 5 ? extension : 'jpg';
}

function buildReceiptPath(file: File): string {
  const today = new Date().toISOString().slice(0, 10);
  const extension = getReceiptExtension(file);

  return `${today}/${crypto.randomUUID()}.${extension}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const fileField = formData.get('file');

    if (!(fileField instanceof File)) {
      return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 });
    }

    if (fileField.size === 0) {
      return NextResponse.json({ error: 'Le fichier est vide.' }, { status: 400 });
    }

    if (fileField.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Le reçu dépasse la taille maximale de 8 Mo.' }, { status: 413 });
    }

    if (fileField.type && !MIME_EXTENSION[fileField.type]) {
      return NextResponse.json({ error: 'Format de reçu non supporté.' }, { status: 415 });
    }

    const filePath = buildReceiptPath(fileField);
    const arrayBuffer = await fileField.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = getSupabaseAdminClient();

    const { error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .upload(filePath, buffer, {
        cacheControl: '31536000',
        contentType: fileField.type || 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Receipt upload failed:', {
        bucket: RECEIPTS_BUCKET,
        path: filePath,
        message: error.message,
      });

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from(RECEIPTS_BUCKET)
      .getPublicUrl(filePath);

    if (!publicUrlData.publicUrl) {
      return NextResponse.json({ error: 'URL publique du reçu introuvable.' }, { status: 500 });
    }

    return NextResponse.json({ path: filePath, url: publicUrlData.publicUrl });
  } catch (err: any) {
    console.error('Receipt upload route failed:', err);
    return NextResponse.json(
      { error: err?.message || 'Erreur interne lors du téléchargement du reçu.' },
      { status: 500 }
    );
  }
}
