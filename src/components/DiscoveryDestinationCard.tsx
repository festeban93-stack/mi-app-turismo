'use client';
import {useState} from 'react';
import Link from 'next/link';
import {MapPin,Clock,ArrowUpRight} from 'lucide-react';
import {useLanguage} from '@/lib/i18n';
import {navigationLink} from '@/lib/travel-mode';
import AddDestinationToTrip from './AddDestinationToTrip';
export default function DiscoveryDestinationCard({spot,userId,onSignIn}:{spot:any;userId?:string;onSignIn:()=>void}) {
 const {t}=useLanguage();const [failed,setFailed]=useState(false);
 const photo=typeof spot.image_url==='string'&&/^https?:\/\//.test(spot.image_url)?spot.image_url:null;
 const mapUrl=`/explore?category=${encodeURIComponent(spot.category)}&spot=${encodeURIComponent(spot.id)}`;
 return <article className="flex flex-col overflow-hidden rounded-3xl border border-[#dce5dc] bg-white text-[#24463a] shadow-sm">
  <Link href={mapUrl} className="relative block h-52 overflow-hidden bg-[#e8eee4]">{photo&&!failed?<img src={photo} alt={spot.title} loading="lazy" className="h-full w-full object-cover transition duration-500 hover:scale-105" onError={()=>setFailed(true)}/>:<div className="flex h-full items-center justify-center gap-2 text-sm"><MapPin size={28}/>{t('Fotografía no disponible')}</div>}<span className="absolute left-4 top-4 rounded-lg bg-white/95 px-3 py-1 text-xs font-bold">{t('Destino aprobado')}</span></Link>
  <div className="flex flex-1 flex-col gap-3 p-5"><p className="text-[10px] uppercase tracking-[.15em] text-[#7b8c77]">{spot.address_text || 'Costa Rica'}</p><h3 className="text-xl font-bold leading-snug"><Link href={mapUrl}>{spot.title}</Link></h3>{spot.description&&<p className="line-clamp-3 text-sm leading-relaxed text-[#73836f]">{spot.description}</p>}<p className="flex items-center gap-2 text-xs text-[#73836f]"><Clock size={14}/>{spot.opening_hours || t('Sin confirmar')}</p><p className="mt-auto border-t border-[#e9eee5] pt-4 text-sm font-bold">{spot.entry_fee || t('Tarifa sin confirmar')}</p><div className="grid grid-cols-2 gap-2"><Link href={mapUrl} className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-[#eaf0e5] p-2 text-xs font-bold">{t('Ver en el mapa')}<ArrowUpRight size={14}/></Link><a href={navigationLink({latitude:spot.latitude,longitude:spot.longitude})} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-1 rounded-xl border p-2 text-xs font-bold">Google Maps ↗</a></div>{userId?<AddDestinationToTrip key={userId+spot.id} userId={userId} destination={{spot_id:spot.id,custom_title:spot.title,custom_address:spot.address_text}}/>:<button className="min-h-11 rounded-xl border border-[#2f6650] p-2 text-sm font-bold" onClick={onSignIn}>{t('Ingresá para agregar a un viaje')}</button>}</div>
 </article>;
}
