import fetch from 'node-fetch';

const ENDPOINTS = [
  'http://localhost:3000/api/cron/blog-scraper',
  'http://localhost:3000/api/cron/viral-scraper',
  'http://localhost:3000/api/cron/social-scraper'
];

console.log('🤖 Motor de Scraping Local Automático Iniciado...');
console.log('Ejecutando ingesta cada 2 minutos en segundo plano...\n');

async function runScrapers() {
  const target = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
  try {
    const res = await fetch(target);
    const data = await res.json();
    console.log(`[${new Date().toLocaleTimeString()}] ✅ Ingesta invocada: ${target}`);
    console.log('   Resultado:', data);
  } catch (err) {
    console.warn(`[${new Date().toLocaleTimeString()}] ⚠️ Asegúrate de tener "npm run dev" corriendo.`);
  }
}

// Ejecutar inmediatamente y luego cada 2 minutos
runScrapers();
setInterval(runScrapers, 2 * 60 * 1000);
