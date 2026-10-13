import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Buscar .env.local en la raíz del proyecto
const envPath = path.resolve(process.cwd(), '.env.local');

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (fs.existsSync(envPath)) {
  console.log(`📄 Leyendo variables desde: ${envPath}`);
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) return;

    const key = trimmed.substring(0, eqIndex).trim();
    const val = trimmed.substring(eqIndex + 1).trim().replace(/^['"]|['"]$/g, '');

    if (!supabaseUrl && (key === 'NEXT_PUBLIC_SUPABASE_URL' || key === 'SUPABASE_URL')) {
      supabaseUrl = val;
    }
    if (!supabaseKey && (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' || key === 'SUPABASE_ANON_KEY' || key === 'SUPABASE_SERVICE_ROLE_KEY')) {
      supabaseKey = val;
    }
  });
} else {
  console.warn(`⚠️ No se encontró el archivo .env.local en: ${envPath}`);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ ERROR: No se detectaron las credenciales de Supabase.');
  console.error('Asegurate de que .env.local contenga las líneas:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co');
  console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key\n');
  process.exit(1);
}

// 2. Banco de Datos Turístico Nacional (7 Provincias de Costa Rica)
const nationalSpots = [
  // Alajuela / Sarchí / Bajos del Toro / Poás / Arenal
  { title: 'Mirador & Café Cadaia Sarchí', description: 'Vista panorámica al Valle Central, café de origen local y repostería artesanal.', category: 'gastronomia', latitude: 10.0934, longitude: -84.3512, address_text: 'Sarchí Norte, Alajuela', opening_hours: '08:00 - 18:00', entry_fee: 'Consumo local' },
  { title: 'Catarata Del Toro', description: 'Impresionante caída de agua de 90 metros dentro de un antiguo cráter volcánico.', category: 'naturaleza', latitude: 10.2036, longitude: -84.2925, address_text: 'Bajos del Toro, Sarchí', opening_hours: '07:00 - 17:00', entry_fee: '₡5,000 / $14 USD' },
  { title: 'Blue Falls of Costa Rica', description: 'Pozas y cataratas de color azul celeste cristalino rodeadas de bosque nuboso.', category: 'naturaleza', latitude: 10.2081, longitude: -84.2967, address_text: 'Bajos del Toro, Sarchí', opening_hours: '07:00 - 16:00', entry_fee: '₡8,000 / $18 USD' },
  { title: 'Café & Mirador Roca Quemada', description: 'Punto panorámico hacia las montañas de Valverde Vega con café chorreado.', category: 'gastronomia', latitude: 10.1089, longitude: -84.3411, address_text: 'Sarchí Sur, Alajuela', opening_hours: '09:00 - 19:00', entry_fee: 'Consumo promedio ₡4,000' },
  { title: 'Parque Nacional Volcán Poás', description: 'Uno de los cráteres volcánicos activos más grandes del mundo.', category: 'naturaleza', latitude: 10.1982, longitude: -84.2307, address_text: 'Poás, Alajuela', opening_hours: '08:00 - 15:30', entry_fee: '₡1,500' },
  { title: 'Catarata Río Celeste', description: 'Famosa catarata de aguas turquesa en el Parque Nacional Volcán Tenorio.', category: 'naturaleza', latitude: 10.7021, longitude: -85.0152, address_text: 'Guatuso, Alajuela', opening_hours: '08:00 - 14:00', entry_fee: '₡800' },
  { title: 'La Fortuna Waterfall', description: 'Espectacular catarata con poza natural para nadar en medio de la selva tropical.', category: 'aventura', latitude: 10.4442, longitude: -84.6675, address_text: 'La Fortuna, Alajuela', opening_hours: '07:30 - 16:00', entry_fee: '₡9,000' },

  // Guanacaste
  { title: 'Playa Conchal', description: 'Icónica playa de aguas cristalinas compuesta por diminutas conchas trituradas.', category: 'naturaleza', latitude: 10.3981, longitude: -85.8169, address_text: 'Santa Cruz, Guanacaste', opening_hours: 'Acceso Libre', entry_fee: 'Gratis' },
  { title: 'Playa Tamarindo', description: 'Playa meca del surf, atardeceres espectaculares y oferta gastronómica variada.', category: 'aventura', latitude: 10.2993, longitude: -85.8402, address_text: 'Tamarindo, Guanacaste', opening_hours: '24 Horas', entry_fee: 'Gratis' },
  { title: 'Parque Nacional Rincón de la Vieja', description: 'Senderos con pailas de barro hirviendo, fumarolas y cataratas.', category: 'naturaleza', latitude: 10.7821, longitude: -85.3421, address_text: 'Liberia, Guanacaste', opening_hours: '08:00 - 15:00', entry_fee: '₡1,000' },

  // Puntarenas / Monteverde / Manuel Antonio
  { title: 'Parque Nacional Manuel Antonio', description: 'Biodiversidad exuberante, monos carablanca, perezosos y playas de agua turquesa.', category: 'naturaleza', latitude: 9.3892, longitude: -84.1415, address_text: 'Quepos, Puntarenas', opening_hours: '07:00 - 15:00', entry_fee: '₡1,800' },
  { title: 'Café & Mirador Monteverde', description: 'Cafetería de altura en el bosque nuboso con cata de café y vistas a la montaña.', category: 'gastronomia', latitude: 10.3160, longitude: -84.8255, address_text: 'Monteverde, Puntarenas', opening_hours: '07:00 - 18:00', entry_fee: 'Consumo local' },
  { title: 'Peñón de Guacalillo', description: 'Acantilado panorámico con vista al Océano Pacífico y atardeceres memorables.', category: 'naturaleza', latitude: 9.8321, longitude: -84.6521, address_text: 'Garabito, Puntarenas', opening_hours: 'Acceso libre', entry_fee: 'Gratis' },

  // San José / Cartago / Heredia / Limón
  { title: 'Catarata Nauyaca', description: 'Imponentes cataratas de dos niveles en medio del cañón de la montaña.', category: 'aventura', latitude: 9.2721, longitude: -83.8242, address_text: 'Pérez Zeledón, San José', opening_hours: '07:00 - 15:00', entry_fee: '₡6,000' },
  { title: 'Ruinas de Ujarrás', description: 'Sitio histórico con la estructura colonial más antigua conservada en Costa Rica.', category: 'cultura', latitude: 9.8251, longitude: -83.8322, address_text: 'Paraíso, Cartago', opening_hours: '08:00 - 16:30', entry_fee: 'Gratis' },
  { title: 'Mirador Orosi', description: 'Parque recreativo con vista panorámica hacia el hermoso Valle de Orosi.', category: 'naturaleza', latitude: 9.7921, longitude: -83.8521, address_text: 'Orosi, Cartago', opening_hours: '08:00 - 16:00', entry_fee: 'Gratis' },
  { title: 'Parque Nacional Cahuita', description: 'Sendero costero bordeado de arrecifes de coral, playas blancas y fauna silvestre.', category: 'naturaleza', latitude: 9.7381, longitude: -82.8421, address_text: 'Talamanca, Limón', opening_hours: '08:00 - 16:00', entry_fee: 'Donación voluntaria' }
];

async function runNationalIngestion() {
  console.log(`\n🔗 Conectado a Supabase: ${supabaseUrl}`);
  console.log(`💾 Enviando ${nationalSpots.length} gemas reales de Costa Rica a la base de datos...`);

  const supabaseRestUrl = `${supabaseUrl}/rest/v1/spots`;

  try {
    const response = await fetch(supabaseRestUrl, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates'
      },
      body: JSON.stringify(nationalSpots)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Supabase REST Error (${response.status}): ${errText}`);
    }

    console.log(`\n✅ ¡ÉXITO TOTAL! Las gemas turísticas nacionales han sido insertadas en Supabase.`);
  } catch (err) {
    console.error('❌ Error durante la ejecución:', err.message || err);
  }
}

runNationalIngestion();