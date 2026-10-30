import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({ error: 'Usá el formulario Agregar destino, con fotografía y revisión.' }, { status: 410 });
}
