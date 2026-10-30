export const experiences = [
 {id:'gastronomia',label:'Gastronomía',lead:'Saboreá el lugar.',description:'Mesas con historia, sabores locales y nuevos favoritos.',photo:'/photos/gastronomia.webp',caption:'Sabores del Barrio Chino, San José',credit:'La Teja',source:'https://www.lateja.cr/nacional/ni-la-lluvia-ni-el-frio-apagan-el-fieston-que/7QDAOAWV6RAIDEZBCBWKSDZ3EM/story/'},
 {id:'naturaleza',label:'Naturaleza',lead:'Respirá profundo.',description:'Dejá que el bosque marque el ritmo.',photo:'/photos/braulio.webp',caption:'Parque Nacional Braulio Carrillo, Costa Rica',credit:'La Nación',source:'https://www.nacion.com/el-pais/parque-nacional-braulio-carrillo-cierra-sector-del/XKRLVAP6KNHGZHNJS4CGK3RO3M/story/'},
 {id:'aventura',label:'Aventura',lead:'Sentí la emoción.',description:'Descubrí hasta dónde querés llegar.',photo:'/photos/osa.webp',caption:'Kayak en Golfo Dulce, región de Osa',credit:'Dolphin Quest · Golfo Dulce',source:'https://www.dolphinquestcr.com/activities'},
 {id:'cultura',label:'Cultura',lead:'Conectá con las historias.',description:'Llevate algo más que una fotografía.',photo:'/photos/festival.webp',caption:'Festival de la Luz, San José',credit:'La Nación · Festival de la Luz 2024',source:'https://www.nacion.com/viva/festival-de-la-luz-2024-vea-todas-las-carrozas-que/LAAQKK5FE5F4ZO5CJCDVCOV4YI/story/'},
] as const;
export type ExperienceId=typeof experiences[number]['id'];
export function normalized(value:unknown):string {return typeof value==='string'?value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim():'';}
export function experienceId(value:unknown):ExperienceId|null {
 const key=normalized(value);
 const aliases:Record<string,ExperienceId>={gastronomia:'gastronomia',gastronomy:'gastronomia',food:'gastronomia',restaurante:'gastronomia',restaurantes:'gastronomia',naturaleza:'naturaleza',nature:'naturaleza',aventura:'aventura',adventure:'aventura',cultura:'cultura',culture:'cultura'};
 return aliases[key] || null;
}
export function approvedDestinations<T extends {is_verified?:boolean;verification_status?:string}>(spots:T[]):T[] {return spots.filter(s=>s.is_verified===true&&s.verification_status==='approved');}
export function destinationsFor<T extends {category?:string;title?:string;address_text?:string}>(spots:T[],category:ExperienceId,query=''):T[] {
 const term=normalized(query);
 return spots.filter(s=>experienceId(s.category)===category&&(!term||normalized(`${s.title || ''} ${s.address_text || ''}`).includes(term)));
}
