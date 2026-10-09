console.log('🤖 Motor de Ingesta Local Automático Iniciado...');
console.log('Ejecutando consultas de scraping cada 2 minutos en segundo plano...\n');

const PORTS = [3000, 3001];
const ENDPOINTS = [
  '/api/cron/blog-scraper',
  '/api/cron/viral-scraper',
  '/api/cron/social-scraper'
];

async function runScrapers() {
  const path = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
  let success = false;

  for (const port of PORTS) {
    const targetUrl = `http://localhost:${port}${path}`;
    try {
      const res = await fetch(targetUrl);
      if (res.ok) {
        const data = await res.json();
        console.log(`[${new Date().toLocaleTimeString()}] ✅ Ingesta invocada exitosamente (${port}): ${path}`);
        console.log('   Resultado:', data);
        success = true;
        break;
      }
    } catch (err) {
      // Probar siguiente puerto si no responde
    }
  }

  if (!success) {
    console.warn(`[${new Date().toLocaleTimeString()}] ⚠️ Servidor no detectado en puertos 3000/3001. Asegúrate de tener "npm run dev" activo.`);
  }
}

// Invocación inmediata y ciclo continuo cada 2 minutos
runScrapers();
setInterval(runScrapers, 2 * 60 * 1000);
