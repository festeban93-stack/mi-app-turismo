import { NextResponse } from 'next/server';

const DENSE_FALLBACK = [
  // GUANACASTE
  { id: 'g1', name: 'Playa Tamarindo', region: 'Guanacaste', category: 'Aventura', short_description: 'Meca del surf y vida nocturna en el Pacífico Norte.', ai_story: 'Capital turística de Guanacaste con atardeceres espectaculares.', tags: ['surf', 'playa'], estimated_price_usd: 0, rating: 4.8, location: { coordinates: [-85.8402, 10.2993] } },
  { id: 'g2', name: 'Playa Langosta', region: 'Guanacaste', category: 'Naturaleza', short_description: 'Tranquila playa residencial vecina a Tamarindo con excelente oleaje.', ai_story: 'Ideal para caminatas al atardecer y observar tortugas en temporada.', tags: ['playa', 'tortugas'], estimated_price_usd: 0, rating: 4.7, location: { coordinates: [-85.8452, 10.2861] } },
  { id: 'g3', name: 'Playa Grande', region: 'Guanacaste', category: 'Naturaleza', short_description: 'Parte del Parque Nacional Marino Las Baulas.', ai_story: 'Santuario de anidación de la tortuga baula y ola derecha de clase mundial.', tags: ['tortugas', 'surf'], estimated_price_usd: 0, rating: 4.9, location: { coordinates: [-85.8431, 10.3321] } },
  { id: 'g4', name: 'Playa Conchal', region: 'Guanacaste', category: 'Naturaleza', short_description: 'Playa famosa cuyas arenas son millones de conchas molidas.', ai_story: 'Aguas turquesas y cristalinas perfectas para esnórquel.', tags: ['playa', 'esnorquel'], estimated_price_usd: 0, rating: 4.9, location: { coordinates: [-85.8117, 10.3951] } },
  { id: 'g5', name: 'Playa Brasilito', region: 'Guanacaste', category: 'Gastronomía', short_description: 'Pueblo pesquero tradicional con sodas de mariscos frente al mar.', ai_story: 'Punto de encuentro auténtico para comer pescado entero frito.', tags: ['gastronomia', 'pescado'], estimated_price_usd: 10, rating: 4.6, location: { coordinates: [-85.8152, 10.3852] } },
  { id: 'g6', name: 'Playa Flamingo', region: 'Guanacaste', category: 'Naturaleza', short_description: 'Bahía de arena blanca y marina náutica de clase mundial.', ai_story: 'Punto de partida icónico para tours en catamarán.', tags: ['playa', 'catamaran'], estimated_price_usd: 0, rating: 4.8, location: { coordinates: [-85.7889, 10.4382] } },
  { id: 'g7', name: 'Playa Potrero', region: 'Guanacaste', category: 'Aventura', short_description: 'Bahía de aguas calmas idónea para paddleboard y vela.', ai_story: 'Excelente ambiente relajado con restaurantes internacionales.', tags: ['paddleboard', 'playa'], estimated_price_usd: 0, rating: 4.7, location: { coordinates: [-85.7721, 10.4561] } },
  { id: 'g8', name: 'Las Catalinas', region: 'Guanacaste', category: 'Cultura', short_description: 'Pueblo peatonal de arquitectura mediterránea frente al mar.', ai_story: 'Desarrollo urbano libre de autos con senderos para bicicleta de montaña.', tags: ['arquitectura', 'ciclismo'], estimated_price_usd: 20, rating: 4.9, location: { coordinates: [-85.7862, 10.4811] } },
  { id: 'g9', name: 'Playa Danta', region: 'Guanacaste', category: 'Naturaleza', short_description: 'Hermosa ensenada sombreada en Las Catalinas.', ai_story: 'Perfecta para nadar con niños y alquilar kayaks de mar.', tags: ['kayak', 'familia'], estimated_price_usd: 0, rating: 4.8, location: { coordinates: [-85.7891, 10.4832] } },
  { id: 'g10', name: 'Playa Avellanas', region: 'Guanacaste', category: 'Aventura', short_description: 'Playa de surfistas con el icónico puente de madera en manglares.', ai_story: 'Hogar de Lola’s y olas legendarias como Little Hawaii.', tags: ['surf', 'manglar'], estimated_price_usd: 0, rating: 4.8, location: { coordinates: [-85.8362, 10.2281] } },
  { id: 'g11', name: 'Playa Negra', region: 'Guanacaste', category: 'Aventura', short_description: 'Playa de arena oscura famosa por su ola de fondo rocoso.', ai_story: 'Inmortalizada en la película de surf Endless Summer II.', tags: ['surf', 'cine'], estimated_price_usd: 0, rating: 4.7, location: { coordinates: [-85.8312, 10.1931] } },
  { id: 'g12', name: 'Playa Hermosa (Papagayo)', region: 'Guanacaste', category: 'Naturaleza', short_description: 'Bahía galardonada con Bandera Azul Ecológica.', ai_story: 'Aguas sin oleaje fuerte ideales para relajarse en familia.', tags: ['playa', 'familia'], estimated_price_usd: 0, rating: 4.8, location: { coordinates: [-85.6721, 10.5841] } },
  { id: 'g13', name: 'Playa del Coco', region: 'Guanacaste', category: 'Gastronomía', short_description: 'Comunidad costera vibrante con oferta nocturna y tours de buceo.', ai_story: 'Uno de los centros pesqueros y turísticos más antiguos de la zona.', tags: ['buceo', 'vida nocturna'], estimated_price_usd: 15, rating: 4.6, location: { coordinates: [-85.6981, 10.5521] } },
  { id: 'g14', name: 'Playa Panama', region: 'Guanacaste', category: 'Naturaleza', short_description: 'Playa ultrasilenciosa de aguas calientes en Golfo de Papagayo.', ai_story: 'Sombra de árboles frondosos a pocos metros del mar.', tags: ['playa', 'sombra'], estimated_price_usd: 0, rating: 4.7, location: { coordinates: [-85.6612, 10.5931] } },
  { id: 'g15', name: 'Parque Nacional Rincón de la Vieja', region: 'Guanacaste', category: 'Aventura', short_description: 'Sendero volcánico con paila de barro hirviendo y fumarolas.', ai_story: 'Muestra la fuerza geotérmica de Costa Rica en bosque seco.', tags: ['volcan', 'senderismo'], estimated_price_usd: 15, rating: 4.8, location: { coordinates: [-85.3341, 10.7781] } },

  // LA FORTUNA / SAN CARLOS
  { id: 'f1', name: 'Volcán Arenal', region: 'La Fortuna / San Carlos', category: 'Naturaleza', short_description: 'Estratovolcán cónico rodeado de bosque lluvioso y termales.', ai_story: 'Ícono volcánico de Costa Rica reconocido mundialmente.', tags: ['volcan', 'naturaleza'], estimated_price_usd: 18, rating: 4.9, location: { coordinates: [-84.7031, 10.4633] } },
  { id: 'f2', name: 'Catarata Río Fortuna', region: 'La Fortuna / San Carlos', category: 'Aventura', short_description: 'Caída de agua de 70m rodeada de selva frondosa.', ai_story: 'Baja 500 escalones entre cañones para nadar en agua helada y cristalina.', tags: ['catarata', 'natacion'], estimated_price_usd: 20, rating: 4.8, location: { coordinates: [-84.6683, 10.4419] } },
  { id: 'f3', name: 'Aguas Termales Tabacón', region: 'La Fortuna / San Carlos', category: 'Naturaleza', short_description: 'Río natural de termales volcánicas en jardines frondosos.', ai_story: 'Calentadas naturally por el magma del Volcán Arenal.', tags: ['termales', 'relajacion'], estimated_price_usd: 85, rating: 4.9, location: { coordinates: [-84.7221, 10.4862] } },
  { id: 'f4', name: 'Termales Baldi', region: 'La Fortuna / San Carlos', category: 'Naturaleza', short_description: 'Complejo de 25 piscinas termales con toboganes.', ai_story: 'Variedad de temperaturas volcánicas en ambiente familiar.', tags: ['termales', 'toboganes'], estimated_price_usd: 40, rating: 4.7, location: { coordinates: [-84.6841, 10.4821] } },
  { id: 'f5', name: 'Termales Los Laureles', region: 'La Fortuna / San Carlos', category: 'Gastronomía', short_description: 'Opción popular de termales con ranchos para picnic.', ai_story: 'Punto accesible frecuentado tanto por locales como por viajeros.', tags: ['termales', 'picnic'], estimated_price_usd: 12, rating: 4.6, location: { coordinates: [-84.6751, 10.4781] } },
  { id: 'f6', name: 'Termales El Choyín (Río Público)', region: 'La Fortuna / San Carlos', category: 'Naturaleza', short_description: 'Sección gratuita del río térmico de Tabacón fuera del resort.', ai_story: 'Gema oculta local para relajarse en el río bajo las estrellas.', tags: ['gema oculta', 'rio termico'], estimated_price_usd: 0, rating: 4.8, location: { coordinates: [-84.7241, 10.4871] } },
  { id: 'f7', name: 'Místico Arenal Hanging Bridges', region: 'La Fortuna / San Carlos', category: 'Aventura', short_description: 'Puentes colgantes a la altura del dosel del bosque.', ai_story: 'Caminata por la copa de los árboles con vistas panorámicas al volcán.', tags: ['puentes', 'fauna'], estimated_price_usd: 32, rating: 4.8, location: { coordinates: [-84.7503, 10.4812] } },
  { id: 'f8', name: 'Sky Adventures Arenal', region: 'La Fortuna / San Carlos', category: 'Aventura', short_description: 'Teleférico Sky Tram y tirolesas de alta velocidad.', ai_story: 'Vuela sobre el dosel de la selva con vista al Lago Arenal.', tags: ['canopy', 'teleferico'], estimated_price_usd: 80, rating: 4.9, location: { coordinates: [-84.7621, 10.4512] } },
  { id: 'f9', name: 'Lago Arenal (Puerto San Luis)', region: 'La Fortuna / San Carlos', category: 'Aventura', short_description: 'El lago más grande de Costa Rica, ideal para kayak y windsurf.', ai_story: 'Embalse hidroeléctrico rodeado de colinas verdes y vida silvestre.', tags: ['lago', 'kayak'], estimated_price_usd: 15, rating: 4.7, location: { coordinates: [-84.8212, 10.5312] } },
  { id: 'f10', name: 'Río Celeste (Volcán Tenorio)', region: 'La Fortuna / San Carlos', category: 'Naturaleza', short_description: 'Río de color azul turquesa por fenómeno óptico mineral.', ai_story: 'Dicen que cuando Dios pintó el cielo, lavó sus pinceles en Río Celeste.', tags: ['rio celeste', 'senderismo'], estimated_price_usd: 12, rating: 4.9, location: { coordinates: [-84.9872, 10.7132] } },

  // MANUEL ANTONIO
  { id: 'm1', name: 'Parque Nacional Manuel Antonio', region: 'Manuel Antonio', category: 'Naturaleza', short_description: 'Reserva natural famosa por sus playas blancas y fauna.', ai_story: 'Hogar de monos perezosos, mapaches y el contraste selva-mar.', tags: ['parque nacional', 'playa'], estimated_price_usd: 18, rating: 4.9, location: { coordinates: [-84.1383, 9.3892] } },
  { id: 'm2', name: 'Playa Espadilla Norte', region: 'Manuel Antonio', category: 'Naturaleza', short_description: 'Playa pública idónea para aprender surf y ver el atardecer.', ai_story: 'Punto perfecto en Quepos para deportes acuáticos y caminatas.', tags: ['playa', 'surf'], estimated_price_usd: 0, rating: 4.7, location: { coordinates: [-84.1432, 9.3981] } },
  { id: 'm3', name: 'Playa Espadilla Sur', region: 'Manuel Antonio', category: 'Naturaleza', short_description: 'Ubicada dentro del Parque Nacional, de aguas turquesas calmas.', ai_story: 'Rodeada de bosque primario donde los monos bajan a los árboles.', tags: ['playa', 'fauna'], estimated_price_usd: 18, rating: 4.9, location: { coordinates: [-84.1402, 9.3851] } },
  { id: 'm4', name: 'Playa Biesanz', region: 'Manuel Antonio', category: 'Naturaleza', short_description: 'Bahía escondida de aguas tranquilas rodeada de selva.', ai_story: 'Gema oculta excelente para kayak de mar y esnórquel sin oleaje.', tags: ['kayak', 'esnorquel'], estimated_price_usd: 0, rating: 4.7, location: { coordinates: [-84.1561, 9.4072] } },
  { id: 'm5', name: 'Marina Pez Vela', region: 'Manuel Antonio', category: 'Gastronomía', short_description: 'Marina náutica de clase mundial con restaurantes frente al mar.', ai_story: 'Centro de Quepos para tours de pesca deportiva y veleros.', tags: ['marina', 'gastronomia'], estimated_price_usd: 30, rating: 4.8, location: { coordinates: [-84.1652, 9.4281] } },
  { id: 'm6', name: 'El Avión Restaurant', region: 'Manuel Antonio', category: 'Gastronomía', short_description: 'Restaurante dentro de un avión C-123 de la era Iran-Contra.', ai_story: 'Tragos al atardecer con vista panorámica al Océano Pacífico.', tags: ['restaurante', 'atardecer'], estimated_price_usd: 25, rating: 4.7, location: { coordinates: [-84.1512, 9.4112] } },

  // SAN JOSÉ
  { id: 's1', name: 'Teatro Nacional de Costa Rica', region: 'San José', category: 'Cultura', short_description: 'Joya arquitectónica neoclásica de 1897.', ai_story: 'Financiado por los cafetaleros del siglo XIX, alberga frescos italianos.', tags: ['cultura', 'historia'], estimated_price_usd: 15, rating: 4.9, location: { coordinates: [-84.0768, 9.9331] } },
  { id: 's2', name: 'Museo del Oro Precolombino', region: 'San José', category: 'Cultura', short_description: 'Colección subterránea de piezas de oro precolombino.', ai_story: 'Resguarda más de 1,500 artefactos indígenas ancestrales.', tags: ['museo', 'arte'], estimated_price_usd: 12, rating: 4.8, location: { coordinates: [-84.0769, 9.9336] } },
  { id: 's3', name: 'Museo del Jade', region: 'San José', category: 'Cultura', short_description: 'La colección de jade precolombino más grande del continente.', ai_story: 'Edificio moderno que simula un bloque de jade en bruto.', tags: ['jade', 'museo'], estimated_price_usd: 16, rating: 4.8, location: { coordinates: [-84.0712, 9.9348] } },
  { id: 's4', name: 'Mercado Central de San José', region: 'San José', category: 'Gastronomía', short_description: 'Corazón gastronómico tradicional con sodas y helados.', ai_story: 'Lugar auténtico para probar un casado tico o café chorreado.', tags: ['gastronomia', 'tradicion'], estimated_price_usd: 8, rating: 4.7, location: { coordinates: [-84.0825, 9.9351] } },
  { id: 's5', name: 'Barrio Escalante', region: 'San José', category: 'Gastronomía', short_description: 'Distrito gastronómico con cerveza artesanal y café especial.', ai_story: 'El epicentro de la escena culinaria moderna y nocturna.', tags: ['gastronomia', 'cerveza'], estimated_price_usd: 25, rating: 4.8, location: { coordinates: [-84.0620, 9.9362] } }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region');
  const category = searchParams.get('category');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('xxxx')) {
      const rpcUrl = `${supabaseUrl}/rest/v1/rpc/get_places_geojson`;
      const res = await fetch(rpcUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        cache: 'no-store'
      });

      if (res.ok) {
        const rawData = await res.json();
        if (Array.isArray(rawData) && rawData.length > 0) {
          let formatted = rawData.map((item: any) => ({
            id: item.id,
            name: item.name,
            region: item.region,
            category: item.category,
            short_description: item.short_description,
            ai_story: item.ai_story,
            tags: item.tags,
            estimated_price_usd: item.estimated_price_usd,
            rating: item.rating,
            location: { type: 'Point', coordinates: [item.lng, item.lat] }
          }));

          if (region && region !== 'Todas') {
            formatted = formatted.filter((p) => p.region.toLowerCase().includes(region.toLowerCase()));
          }
          if (category && category !== 'Todas') {
            formatted = formatted.filter((p) => p.category === category);
          }

          return NextResponse.json(formatted);
        }
      }
    }
    throw new Error('Fallback a dataset local amplio');
  } catch (error) {
    let filtered = [...DENSE_FALLBACK];
    if (region && region !== 'Todas') {
      filtered = filtered.filter((p) => p.region.toLowerCase().includes(region.toLowerCase()));
    }
    if (category && category !== 'Todas') {
      filtered = filtered.filter((p) => p.category === category);
    }
    return NextResponse.json(filtered);
  }
}
