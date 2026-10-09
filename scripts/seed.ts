import fs from 'node:fs';
import path from 'node:path';

const DENSE_CR_DATASET = [
  // --- GUANACASTE (PLAYAS, SODAS, TOURS, GASTRONOMÍA) ---
  { name: 'Playa Tamarindo', region: 'Guanacaste', category: 'Aventura', lat: 10.2993, lng: -85.8402, price: 0, desc: 'Meca del surf y vida nocturna en el Pacífico Norte.', story: 'Capital turística de Guanacaste con atardeceres espectaculares.' },
  { name: 'Playa Langosta', region: 'Guanacaste', category: 'Naturaleza', lat: 10.2861, lng: -85.8452, price: 0, desc: 'Tranquila playa residencial vecina a Tamarindo con excelente oleaje.', story: 'Ideal para caminatas al atardecer y observar tortugas en temporada.' },
  { name: 'Playa Grande', region: 'Guanacaste', category: 'Naturaleza', lat: 10.3321, lng: -85.8431, price: 0, desc: 'Parte del Parque Nacional Marino Las Baulas.', story: 'Santuario de anidación de la tortuga baula y ola derecha de clase mundial.' },
  { name: 'Playa Conchal', region: 'Guanacaste', category: 'Naturaleza', lat: 10.3951, lng: -85.8117, price: 0, desc: 'Playa famosa cuyas arenas son millones de conchas molidas.', story: 'Aguas turquesas y cristalinas perfectas para esnórquel.' },
  { name: 'Playa Brasilito', region: 'Guanacaste', category: 'Gastronomía', lat: 10.3852, lng: -85.8152, price: 10, desc: 'Pueblo pesquero tradicional con sodas de mariscos frente al mar.', story: 'Punto de encuentro auténtico para comer pescado entero frito.' },
  { name: 'Playa Flamingo', region: 'Guanacaste', category: 'Naturaleza', lat: 10.4382, lng: -85.7889, price: 0, desc: 'Bahía de arena blanca y marina náutica de clase mundial.', story: 'Punto de partida icónico para tours en catamarán.' },
  { name: 'Playa Potrero', region: 'Guanacaste', category: 'Aventura', lat: 10.4561, lng: -85.7721, price: 0, desc: 'Bahía de aguas calmas idónea para paddleboard y vela.', story: 'Excelente ambiente relajado con restaurantes internacionales.' },
  { name: 'Las Catalinas', region: 'Guanacaste', category: 'Cultura', lat: 10.4811, lng: -85.7862, price: 20, desc: 'Pueblo peatonal de arquitectura mediterránea frente al mar.', story: 'Desarrollo urbano libre de autos con senderos para bicicleta de montaña.' },
  { name: 'Playa Danta', region: 'Guanacaste', category: 'Naturaleza', lat: 10.4832, lng: -85.7891, price: 0, desc: 'Hermosa ensenada sombreada en Las Catalinas.', story: 'Perfecta para nadar con niños y alquilar kayaks de mar.' },
  { name: 'Playa Avellanas', region: 'Guanacaste', category: 'Aventura', lat: 10.2281, lng: -85.8362, price: 0, desc: 'Playa de surfistas con el icónico puente de madera en manglares.', story: 'Hogar de Lola’s y olas legendarias como Little Hawaii.' },
  { name: 'Playa Negra', region: 'Guanacaste', category: 'Aventura', lat: 10.1931, lng: -85.8312, price: 0, desc: 'Playa de arena oscura famosa por su ola de fondo rocoso.', story: 'Inmortalizada en la película de surf Endless Summer II.' },
  { name: 'Playa Hermosa (Papagayo)', region: 'Guanacaste', category: 'Naturaleza', lat: 10.5841, lng: -85.6721, price: 0, desc: 'Bahía galardonada con Bandera Azul Ecológica.', story: 'Aguas sin oleaje fuerte ideales para relajarse en familia.' },
  { name: 'Playa del Coco', region: 'Guanacaste', category: 'Gastronomía', lat: 10.5521, lng: -85.6981, price: 15, desc: 'Comunidad costera vibrante con oferta nocturna y tours de buceo.', story: 'Uno de los centros pesqueros y turísticos más antiguos de la zona.' },
  { name: 'Playa Panama', region: 'Guanacaste', category: 'Naturaleza', lat: 10.5931, lng: -85.6612, price: 0, desc: 'Playa ultrasilenciosa de aguas calientes en Golfo de Papagayo.', story: 'Sombra de árboles frondosos a pocos metros del mar.' },
  { name: 'Parque Nacional Rincón de la Vieja', region: 'Guanacaste', category: 'Aventura', lat: 10.7781, lng: -85.3341, price: 15, desc: 'Sendero volcánico con paila de barro hirviendo y fumarolas.', story: 'Muestra la fuerza geotérmica de Costa Rica en bosque seco.' },
  { name: 'Catarata Llanos de Cortés', region: 'Guanacaste', category: 'Naturaleza', lat: 10.5241, lng: -85.1821, price: 10, desc: 'Amplia cascada con playa de arena dorada cerca de Bagaces.', story: 'Oasis dulce rodeado de vegetación para nadar tranquilamente.' },
  { name: 'Playa Nosara / Guiones', region: 'Guanacaste', category: 'Aventura', lat: 9.9241, lng: -85.6712, price: 0, desc: 'Hub mundial de surf, yoga y bienestar sustentable.', story: 'Refugio de tranquilidad famoso por la anidación de tortugas en Ostional.' },
  { name: 'Refugio de Vida Silvestre Ostional', region: 'Guanacaste', category: 'Naturaleza', lat: 9.9981, lng: -85.7012, price: 12, desc: 'Escenario de arribadas masivas de tortugas lora.', story: 'Uno de los pocos lugares del mundo con desove multitudinario.' },

  // --- LA FORTUNA / SAN CARLOS (VOLCANES, TERMALES, CATARATAS, AVENTURA) ---
  { name: 'Volcán Arenal', region: 'La Fortuna / San Carlos', category: 'Naturaleza', lat: 10.4633, lng: -84.7031, price: 18, desc: 'Estratovolcán cónico rodeado de bosque lluvioso y termales.', story: 'Ícono volcánico de Costa Rica reconocido mundialmente.' },
  { name: 'Catarata Río Fortuna', region: 'La Fortuna / San Carlos', category: 'Aventura', lat: 10.4419, lng: -84.6683, price: 20, desc: 'Caída de agua de 70m rodeada de selva frondosa.', story: 'Baja 500 escalones entre cañones para nadar en agua helada y cristalina.' },
  { name: 'Aguas Termales Tabacón', region: 'La Fortuna / San Carlos', category: 'Naturaleza', lat: 10.4862, lng: -84.7221, price: 85, desc: 'Río natural de termales volcánicas en jardines frondosos.', story: 'Calentadas naturalmente por el magma del Volcán Arenal.' },
  { name: 'Termales Baldi', region: 'La Fortuna / San Carlos', category: 'Naturaleza', lat: 10.4821, lng: -84.6841, price: 40, desc: 'Complejo de 25 piscinas termales con toboganes.', story: 'Variedad de temperaturas volcánicas en ambiente familiar.' },
  { name: 'Termales Los Laureles', region: 'La Fortuna / San Carlos', category: 'Gastronomía', lat: 10.4781, lng: -84.6751, price: 12, desc: 'Opción popular de termales con ranchos para picnic.', story: 'Punto accesible frecuentado tanto por locales como por viajeros.' },
  { name: 'Termales El Choyín (Río Público)', region: 'La Fortuna / San Carlos', category: 'Naturaleza', lat: 10.4871, lng: -84.7241, price: 0, desc: 'Sección gratuita del río térmico de Tabacón fuera del resort.', story: 'Gema oculta local para relajarse en el río bajo las estrellas.' },
  { name: 'Místico Arenal Hanging Bridges', region: 'La Fortuna / San Carlos', category: 'Aventura', lat: 10.4812, lng: -84.7503, price: 32, desc: 'Puentes colgantes a la altura del dosel del bosque.', story: 'Caminata por la copa de los árboles con vistas panorámicas al volcán.' },
  { name: 'Sky Adventures Arenal', region: 'La Fortuna / San Carlos', category: 'Aventura', lat: 10.4512, lng: -84.7621, price: 80, desc: 'Teleférico Sky Tram y tirolesas de alta velocidad.', story: 'Vuela sobre el dosel de la selva con vista al Lago Arenal.' },
  { name: 'Lago Arenal (Puerto San Luis)', region: 'La Fortuna / San Carlos', category: 'Aventura', lat: 10.5312, lng: -84.8212, price: 15, desc: 'El lago más grande de Costa Rica, ideal para kayak y windsurf.', story: 'Embalse hidroeléctrico rodeado de colinas verdes y vida silvestre.' },
  { name: 'Río Celeste (Volcán Tenorio)', region: 'La Fortuna / San Carlos', category: 'Naturaleza', lat: 10.7132, lng: -84.9872, price: 12, desc: 'Río de color azul turquesa por fenómeno óptico mineral.', story: 'Famoso por El Tenidero y su impresionante catarata azurada.' },
  { name: 'Ecoglide Arenal Park', region: 'La Fortuna / San Carlos', category: 'Aventura', lat: 10.4712, lng: -84.6621, price: 55, desc: 'Canopy zipline con el famoso Tarzan Swing.', story: 'Aventura segura e intensa en medio del bosque secundario.' },
  { name: 'Arenal Natura Ecological Park', region: 'La Fortuna / San Carlos', category: 'Naturaleza', lat: 10.4912, lng: -84.6981, price: 28, desc: 'Jardines de ranas, serpentario y tours nocturnos.', story: 'Especializado en herpetología y conservación de anfibios.' },

  // --- MANUEL ANTONIO / QUEPOS (PLAYAS, PARQUES, GASTRONOMÍA) ---
  { name: 'Parque Nacional Manuel Antonio', region: 'Manuel Antonio', category: 'Naturaleza', lat: 9.3892, lng: -84.1383, price: 18, desc: 'Reserva natural famosa por sus playas blancas y abundante fauna.', story: 'Hogar de monos perezosos, mapaches y tucanes a orillas del mar.' },
  { name: 'Playa Espadilla Norte', region: 'Manuel Antonio', category: 'Naturaleza', lat: 9.3981, lng: -84.1432, price: 0, desc: 'Playa pública idónea para aprender surf y ver el atardecer.', story: 'Centro deportivo costero para alquiler de sombrillas y parasailing.' },
  { name: 'Playa Espadilla Sur', region: 'Manuel Antonio', category: 'Naturaleza', lat: 9.3851, lng: -84.1402, price: 18, desc: 'Ubicada dentro del Parque Nacional, de aguas turquesas calmas.', story: 'Rodeada de bosque primario donde los monos bajan a los árboles.' },
  { name: 'Playa Manuel Antonio', region: 'Manuel Antonio', category: 'Naturaleza', lat: 9.3812, lng: -84.1362, price: 18, desc: 'Famosa ensenada curva protegida por arrecifes dentro del parque.', story: 'Considerada una de las playas más hermosas de Centroamérica.' },
  { name: 'Playa Biesanz', region: 'Manuel Antonio', category: 'Naturaleza', lat: 9.4072, lng: -84.1561, price: 0, desc: 'Bahía escondida de aguas tranquilas rodeada de selva.', story: 'Gema oculta excelente para snorkel y alquiler de kayaks.' },
  { name: 'Playa Playitas', region: 'Manuel Antonio', category: 'Aventura', lat: 9.4021, lng: -84.1481, price: 0, desc: 'Extremo norte de Espadilla, zona tranquila con formaciones rocosas.', story: 'Favorita por locales para ver la puesta de sol con menos multitudes.' },
  { name: 'Marina Pez Vela', region: 'Manuel Antonio', category: 'Gastronomía', lat: 9.4281, lng: -84.1652, price: 30, desc: 'Marina náutica de clase mundial con restaurantes sobre el mar.', story: 'Epicentro de torneos internacionales de pesca deportiva.' },
  { name: 'El Avión Restaurant', region: 'Manuel Antonio', category: 'Gastronomía', lat: 9.4112, lng: -84.1512, price: 25, desc: 'Restaurante y bar dentro de un avión Fairchild C-123 de la era Iran-Contra.', story: 'Ofrece trágos al atardecer con vista panorámica al Océano Pacífico.' },
  { name: 'Rainmaker Conservation Park', region: 'Manuel Antonio', category: 'Aventura', lat: 9.5121, lng: -84.1281, price: 20, desc: 'Reserva privada de selva con puentes colgantes y pozas de río.', story: 'Santuario de anfibios y caminatas sobre riachuelos cristalinos.' },

  // --- SAN JOSÉ & VALLE CENTRAL ---
  { name: 'Teatro Nacional de Costa Rica', region: 'San José', category: 'Cultura', lat: 9.9331, lng: -84.0768, price: 15, desc: 'Joya arquitectónica de 1897 en el centro histórico.', story: 'Financiado por los cafetaleros del siglo XIX, alberga frescos italianos.' },
  { name: 'Museo del Oro Precolombino', region: 'San José', category: 'Cultura', lat: 9.9336, lng: -84.0769, price: 12, desc: 'Colección subterránea bajo la Plaza de la Cultura.', story: 'Resguarda más de 1,500 piezas indígenas de oro ancestral.' },
  { name: 'Museo del Jade y de la Cultura Precolombina', region: 'San José', category: 'Cultura', lat: 9.9348, lng: -84.0712, price: 16, desc: 'La colección de jade americano arqueológico más grande del mundo.', story: 'Edificio moderno que imita un bloque de jade en bruto.' },
  { name: 'Mercado Central de San José', region: 'San José', category: 'Gastronomía', lat: 9.9351, lng: -84.0825, price: 8, desc: 'Corazón gastronómico tradicional con sodas y artesanías.', story: 'Fundado en 1880, prueba un casado o un helado de sorbetera.' },
  { name: 'Barrio Escalante', region: 'San José', category: 'Gastronomía', lat: 9.9362, lng: -84.0620, price: 25, desc: 'Distrito gastronómico con cerveza artesanal y café especial.', story: 'Epicentro de la oferta culinaria moderna y nocturna capitalina.' },
  { name: 'Parque La Sabana', region: 'San José', category: 'Naturaleza', lat: 9.9352, lng: -84.1015, price: 0, desc: 'El "pulmón de San José", parque urbano con lago.', story: 'Antiguo aeropuerto internacional transformado en espacio deportivo.' },
  { name: 'Volcán Poás', region: 'San José', category: 'Naturaleza', lat: 10.1982, lng: -84.2312, price: 15, desc: 'Cráter activo con laguna ácida azul turquesa.', story: 'Uno de los cráteres accesibles más grandes del planeta.' },
  { name: 'Volcán Irazú', region: 'San José', category: 'Naturaleza', lat: 9.9791, lng: -83.8521, price: 15, desc: 'El volcán más alto de Costa Rica (3,432m).', story: 'En días muy despejados se divisan ambos océanos Pacífico y Caribe.' },
  { name: 'Catarata del Toro', region: 'San José', category: 'Aventura', lat: 10.2581, lng: -84.2812, price: 14, desc: 'Cascada de 90m que cae dentro de un cráter extinguido.', story: 'Rodeada de bosque nuboso y decenas de especies de colibríes.' },
  { name: 'Sarchi (Fábrica de Carretas Joaquín Chaverri)', region: 'San José', category: 'Cultura', lat: 10.0912, lng: -84.3412, price: 0, desc: 'Cuna de la artesanía nacional y carretas pintadas de madera.', story: 'Hogar de la carreta pintada más grande del mundo en el parque central.' }
];

function escapeSQL(text: string): string {
  return (text || '').replace(/'/g, "''");
}

function run() {
  console.log('🚀 Generando Ingesta Densificada de Costa Rica...\n');

  let sql = `-- SCRIPT DE INSERCIÓN GEOESPACIAL DENSA (${DENSE_CR_DATASET.length} POIs)\n\n`;

  DENSE_CR_DATASET.forEach((p) => {
    const cleanName = escapeSQL(p.name);
    const cleanRegion = escapeSQL(p.region);
    const cleanDesc = escapeSQL(p.desc);
    const cleanStory = escapeSQL(p.story);
    
    sql += `SELECT insert_poi_with_location(\n`;
    sql += `  '${cleanName}',\n`;
    sql += `  '${p.category}',\n`;
    sql += `  '${cleanRegion}',\n`;
    sql += `  ${p.lat},\n`;
    sql += `  ${p.lng},\n`;
    sql += `  '${cleanDesc}',\n`;
    sql += `  '${cleanStory}',\n`;
    sql += `  ARRAY['turismo', 'costa rica', '${p.category.toLowerCase()}'],\n`;
    sql += `  ${p.price}\n`;
    sql += `);\n\n`;
  });

  const outputPath = path.resolve(process.cwd(), 'seed_output.sql');
  fs.writeFileSync(outputPath, sql, 'utf8');
  console.log(`✅ ¡Archivo SQL generado exitosamente con ${DENSE_CR_DATASET.length} puntos densificados!`);
  console.log(`📁 Archivo listo en: ${outputPath}`);
}

run();
