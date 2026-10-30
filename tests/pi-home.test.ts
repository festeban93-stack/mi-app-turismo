import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {heroSlides,HERO_INTERVAL} from '../src/lib/hero-slides';
import {translate} from '../src/lib/i18n';
test('Pi hero rotates every five seconds and uses four locally available HD photographs with sources',async()=>{
 assert.equal(HERO_INTERVAL,5000);
 assert.equal(heroSlides.length,4);
 for(const slide of heroSlides){
  const bytes=await readFile(new URL('../public'+slide.src,import.meta.url));
  const meta=await sharp(bytes).metadata();
  assert.ok((meta.width || 0)>=1920,slide.src);
  assert.ok(slide.url.startsWith('https://'));
  assert.ok(slide.source.length>5);
 }
});
test('language translation covers landing, sign-in, exploration and saved-trip actions without changing user notes or place names',()=>{
 assert.equal(translate('Ir al mapa','en'),'Explore the map');
 assert.equal(translate('Iniciar Sesión','en'),'Sign in');
 assert.equal(translate('Naturaleza','en'),'Nature');
 assert.equal(translate('Mis Viajes','en'),'My trips');
 assert.equal(translate('Guardar cambios','en'),'Save changes');
 assert.equal(translate('Ver mapa completo ↓','en'),'Show full map ↓');
 assert.equal(translate('Puerto Viejo de Talamanca','en'),'Puerto Viejo de Talamanca');
 assert.equal(translate('Mi reserva personal: 123','en'),'Mi reserva personal: 123');
 assert.equal(translate('Agregar a un viaje','es'),'Agregar a un viaje');
 assert.equal(translate(' Día ','en'),' Day ');
 assert.equal(translate('Agregado a «Caribe», día 2.','en'),'Added to “Caribe”, day 2.');
});
