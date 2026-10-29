export class BodyError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function limitedRequest(request: Request, maxBytes: number) {
  const length = Number(request.headers.get('content-length'));
  if (length > maxBytes) throw new BodyError('El archivo o solicitud es demasiado grande.', 413);
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) { await reader.cancel(); throw new BodyError('La solicitud es demasiado grande.', 413); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
  }
  return new Request(request.url, { method: request.method, headers: request.headers, body: Buffer.concat(chunks) });
}

export async function readJSON(request: Request, maxBytes = 64 * 1024) {
  try { return await (await limitedRequest(request, maxBytes)).json(); }
  catch (error) {
    if (error instanceof BodyError) throw error;
    throw new BodyError('JSON inválido.');
  }
}
