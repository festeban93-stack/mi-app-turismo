'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowUpRight,Compass,Utensils,Leaf,Mountain,Landmark,Search,UserRound} from 'lucide-react';
import {LanguageSwitch,useLanguage} from '@/lib/i18n';
import {experiences,experienceId,approvedDestinations,destinationsFor,type ExperienceId} from '@/lib/discovery';
import {supabase} from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';
import DiscoveryDestinationCard from '@/components/DiscoveryDestinationCard';
const icons={gastronomia:Utensils,naturaleza:Leaf,aventura:Mountain,cultura:Landmark};
export default function DiscoverPage() {
 const {t}=useLanguage();
 const [active,setActive]=useState<ExperienceId>('naturaleza');
 const [selected,setSelected]=useState<ExperienceId|null>(null);
 const [spots,setSpots]=useState<any[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [query,setQuery]=useState('');
 const [userId,setUserId]=useState<string>();
 const [authOpen,setAuthOpen]=useState(false);
 const [reload,setReload]=useState(0);
 useEffect(()=>{
  const read=()=>{const id=experienceId(new URLSearchParams(location.search).get('category'));setSelected(id);if(id)setActive(id);setQuery('');};
  queueMicrotask(read);window.addEventListener('popstate',read);
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUserId(session?.user.id));
  return()=>{window.removeEventListener('popstate',read);subscription.unsubscribe();};
 },[]);
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/spots',{signal:controller.signal,cache:'no-store'}).then(async response=>{const data=await response.json();if(!response.ok||data.success===false)throw Error();setSpots(approvedDestinations(Array.isArray(data.spots)?data.spots:[]));setError('');}).catch(()=>{if(!controller.signal.aborted)setError('No pudimos cargar los destinos. Intentá nuevamente.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[reload]);
 const current=experiences.find(e=>e.id===active)!;
 const choose=(id:ExperienceId|null)=>{setSelected(id);if(id)setActive(id);setQuery('');history.pushState({},'',id?`/discover?category=${id}`:'/discover');window.scrollTo({top:0,behavior:'instant'});};
 const destinations=selected?destinationsFor(spots,selected,query):[];
 return <main className="min-h-screen bg-[#f6f8f2] text-[#214737]">
  <section className={`relative isolate overflow-hidden bg-[#123b30] text-white ${selected?'min-h-[48svh]':'min-h-[100svh]'}`}>
   <div className="absolute inset-0 -z-20" aria-hidden="true">{experiences.map(e=><img key={e.id} src={e.photo} alt="" loading={e.id==='naturaleza'?'eager':'lazy'} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 motion-reduce:transition-none ${active===e.id?'opacity-100':'opacity-0'}`}/>)}</div>
   <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(3,34,28,.88),rgba(3,34,28,.54),rgba(3,34,28,.28))]"/>
   <header className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-10 lg:px-16"><Link href="/" aria-label="Pi" className="flex items-center gap-2 text-3xl font-extrabold"><Compass size={30}/>Pi<span className="text-[#e0eca8]">.</span></Link><nav className="flex flex-wrap items-center gap-3"><LanguageSwitch light/><Link href="/explore" className="hidden min-h-11 items-center rounded-full border border-white/30 px-4 text-sm font-semibold sm:flex">{t('Ver mapa completo')}</Link><button className="flex min-h-11 items-center gap-2 rounded-full border border-white/30 px-4 text-sm" onClick={()=>userId?location.assign('/explore?view=profile'):setAuthOpen(true)}><UserRound size={16}/>{t(userId?'Mi cuenta':'Ingresar')}</button></nav></header>
   <div className="mx-auto max-w-[1450px] px-6 pb-16 pt-10 sm:px-10 lg:px-16 lg:pt-20">
    {selected?<><button onClick={()=>choose(null)} className="mb-7 flex min-h-11 items-center gap-2 text-sm font-bold"><ArrowLeft size={16}/>{t('Volver a las experiencias')}</button><p className="mb-4 text-xs font-bold uppercase tracking-[.24em] text-[#e0eca8]">{t('Tu próxima historia empieza acá.')}</p><h1 className="text-[clamp(3rem,7vw,6rem)] font-bold leading-tight tracking-[-.05em]">{t(current.label)}</h1><p className="mt-4 max-w-xl text-base text-white/85">{t(current.lead)} {t(current.description)}</p></>:<><p className="mb-8 text-[10px] font-bold uppercase tracking-[.28em] text-[#e0eca8]">{t('Un país. Cuatro formas de sentirlo.')}</p><h1 className="max-w-[1000px] text-[clamp(2.7rem,5.6vw,5.8rem)] font-bold leading-[1.08] tracking-[-.055em]">{t('Tu próxima historia')}<br/>{t('empieza con una elección.')}</h1><p className="mt-6 text-sm text-white/80">{t('Pasá el cursor para descubrir. Elegí para explorar.')}</p>
    <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">{experiences.map((e,i)=>{const Icon=icons[e.id];return <button key={e.id} onMouseEnter={()=>setActive(e.id)} onFocus={()=>setActive(e.id)} onClick={()=>choose(e.id)} className={`group min-h-40 border-t px-4 py-5 text-left transition-colors ${active===e.id?'border-[#e0eca8] bg-white/10 text-[#e0eca8]':'border-white/30 hover:bg-white/10'}`}><span className="mb-7 flex items-center justify-between text-xs text-white/60">0{i+1} /<Icon size={20}/></span><span className="flex items-center justify-between text-2xl font-bold lg:text-3xl">{t(e.label)}<ArrowUpRight size={21}/></span><span className="mt-5 block text-xs leading-relaxed text-white/85">{t(e.lead)}<br/>{t(e.description)}</span></button>;})}</div><button onClick={()=>choose(active)} className="mt-8 flex min-h-14 items-center gap-12 rounded-xl bg-[#f5f6ea] px-6 py-4 text-sm font-bold text-[#234f3e]">{t('Explorar')} {t(current.label)}<ArrowUpRight size={18}/></button></>}
   </div><div className="px-6 pb-5 text-right text-[10px] text-white/80 sm:px-10 lg:px-16"><p>⌖ {t(current.caption)}</p><a href={current.source} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-white/55 hover:text-white">{t('Fotografía')}: {current.credit} ↗</a></div>
  </section>
  {selected&&<section className="mx-auto max-w-[1450px] px-6 py-10 sm:px-10 lg:px-16">
   <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#83937a]">{t('Descubrí tu próximo destino')}</p><h2 className="mt-2 text-2xl font-bold">{t('Lugares para explorar')}</h2>{!loading&&!error&&<p className="mt-2 text-sm text-[#71816b]">{destinations.length} {t('destinos aprobados')}</p>}</div><label className="flex min-h-12 items-center gap-3 rounded-xl border border-[#dce5dc] bg-white px-4"><Search size={18}/><input aria-label={t('Buscar destino')} placeholder={t('Buscar por nombre o lugar…')} className="w-full bg-transparent py-3 text-sm outline-none" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
   {loading?<p role="status" className="py-10 text-center">{t('Cargando destinos…')}</p>:error?<div role="alert" className="rounded-2xl border p-6"><p>{t(error)}</p><button className="mt-3 min-h-11 font-bold underline" onClick={()=>{setLoading(true);setReload(n=>n+1);}}>{t('Reintentar')}</button></div>:destinations.length?<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{destinations.map(spot=><DiscoveryDestinationCard key={spot.id} spot={spot} userId={userId} onSignIn={()=>setAuthOpen(true)}/>)}</div>:<div className="rounded-3xl border border-[#dce5dc] bg-white p-10 text-center"><h3 className="font-bold">{t(query?'No hay coincidencias.':'Todavía no hay destinos aprobados en esta categoría.')}</h3><p className="mt-3 text-sm text-[#71816b]">{t('Los nuevos destinos aparecerán aquí cuando sean aprobados.')}</p></div>}
  </section>}
  <AuthModal isOpen={authOpen} onClose={()=>setAuthOpen(false)} onSuccess={()=>setAuthOpen(false)}/>
 </main>;
}
