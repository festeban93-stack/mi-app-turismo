import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {experiences,experienceId,approvedDestinations,destinationsFor} from '../src/lib/discovery';
const spots=[
 {id:'food',title:'Café de San José',category:'Gastronomía',address_text:'Barrio Chino',is_verified:true,verification_status:'approved'},
 {id:'nature',title:'Braulio Carrillo',category:'naturaleza',is_verified:true,verification_status:'approved'},
 {id:'culture',title:'Museo',category:'cultura',is_verified:true,verification_status:'approved'},
 {id:'adventure',title:'Kayak',category:'aventura',is_verified:true,verification_status:'approved'},
 {id:'pending',title:'Restaurante pendiente',category:'gastronomia',is_verified:false,verification_status:'pending'},
 {id:'rejected',title:'Restaurante rechazado',category:'gastronomia',is_verified:true,verification_status:'rejected'},
 {id:'hotel',title:'Hotel',category:'hospedaje',is_verified:true,verification_status:'approved'},
];
test('experience classification handles accents and case while keeping the four categories separate',()=>{
 assert.equal(experienceId(' GASTRONOMÍA '),'gastronomia');
 assert.equal(experienceId('Nature'),'naturaleza');
 assert.equal(experienceId('hospedaje'),null);
 assert.equal(experienceId('<script>'),null);
 const approved=approvedDestinations(spots);
 for(const experience of experiences)assert.equal(destinationsFor(approved,experience.id).length,1);
});
test('only approved destinations reach category cards; search ignores accents',()=>{
 const approved=approvedDestinations(spots);
 assert.equal(destinationsFor(approved,'gastronomia','cafe')[0].id,'food');
 assert.equal(destinationsFor(approved,'gastronomia','SAN JOSE')[0].id,'food');
 assert.equal(destinationsFor(approved,'gastronomia','rechazado').length,0);
 assert.equal(destinationsFor(approved,'cultura','cafe').length,0);
});
test('four experience backgrounds have local photos and traceable sources',async()=>{
 assert.equal(experiences.length,4);
 for(const experience of experiences){assert.ok((await readFile(new URL('../public'+experience.photo,import.meta.url))).length>10000);assert.ok(experience.source.startsWith('https://'));}
});
