import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { place_id, owner_name, owner_email, owner_phone } = await request.json();

    if (!place_id || !owner_email || !owner_phone) {
      return NextResponse.json({ error: 'Faltan datos obligatorios para verificar el negocio.' }, { status: 400 });
    }

    console.log(`💼 Solicitud de Reclamo B2B recibida para el Lugar ID: ${place_id} por ${owner_name} (${owner_email})`);

    return NextResponse.json({
      success: true,
      message: '¡Solicitud de reclamo recibida! Nuestro equipo verificará tu comercio en menos de 24 horas.',
      claim_id: `CLAIM-${Date.now()}`
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Error procesando la solicitud B2B' }, { status: 500 });
  }
}
