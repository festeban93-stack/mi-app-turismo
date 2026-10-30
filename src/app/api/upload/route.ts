import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { NextResponse } from 'next/server';
import { requireAccess, consumeQuota, serviceClient } from '@/lib/server/access';
import { BodyError, limitedRequest } from '@/lib/server/body';

export const runtime = 'nodejs';
const MAX_FILE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const access = await requireAccess(request);
  if (access instanceof Response) return access;
  try {
    const denied = await consumeQuota(access.user.id, 'upload');
    if (denied) return denied;
    const form = await (await limitedRequest(request, MAX_FILE + 64 * 1024)).formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new BodyError('Seleccioná una imagen.');
    if (file.size > MAX_FILE) throw new BodyError('La imagen supera los 5 MB.', 413);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new BodyError('Usá una imagen JPEG, PNG o WebP.', 415);
    // Decode actual bytes and re-encode: filenames/MIME alone are not trusted.
    let buffer: Buffer;
    try {
      const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 25_000_000, animated: false });
      const metadata = await image.metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format || '')) throw new Error('Formato inválido');
      buffer = await image.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    } catch { throw new BodyError('El archivo no es una imagen válida o excede los límites de resolución.', 415); }
    const db = serviceClient();
    const path = `uploads/${access.user.id}/${randomUUID()}.webp`;
    const { error } = await db.storage.from('spot-images').upload(path, buffer, { contentType: 'image/webp', upsert: false });
    if (error) throw error;
    const { data } = db.storage.from('spot-images').getPublicUrl(path);
    return NextResponse.json({ success: true, imageUrl: data.publicUrl }, { status: 201 });
  } catch (error) {
    console.error('Upload failed', error instanceof BodyError ? error.message : 'Storage unavailable');
    return NextResponse.json({ success: false, error: error instanceof BodyError ? error.message : 'No fue posible subir la imagen.' }, { status: error instanceof BodyError ? error.status : 503 });
  }
}
