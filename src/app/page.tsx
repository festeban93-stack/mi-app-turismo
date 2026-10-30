'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,Pause,Play,ArrowUpRight,UserRound,Compass} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';
import {LanguageSwitch,useLanguage} from '@/lib/i18n';
import {heroSlides,HERO_INTERVAL} from '@/lib/hero-slides';
export default function PiHome() {
 const {t}=useLanguage();
 const [active,setActive]=useState(0);
 const [paused,setPaused]=useState(false);
 const [reduced,setReduced]=useState(false);
 const [authOpen,setAuthOpen]=useState(false);
 const [signedIn,setSignedIn]=useState(false);
 useEffect(()=>{
  if(new URLSearchParams(window.location.search).has('tripId'))window.location.replace('/explore'+window.location.search);
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const change=()=>setReduced(preference.matches);change();preference.addEventListener('change',change);
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setSignedIn(Boolean(session)));
  return()=>{preference.removeEventListener('change',change);subscription.unsubscribe();};
 },[]);
 useEffect(()=>{
  if(paused||reduced||authOpen)return;
  const timer=setInterval(()=>{if(!document.hidden)setActive(a=>(a+1)%heroSlides.length);},HERO_INTERVAL);
  return()=>clearInterval(timer);
 },[paused,reduced,authOpen]);
 const next=(direction:number)=>setActive(a=>(a+direction+heroSlides.length)%heroSlides.length);
 const slide=heroSlides[active];
 return <main className="pi-home relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#103c32] text-white">
  <div className="absolute inset-0 -z-20" aria-hidden="true">{heroSlides.map((photo,i)=><img key={photo.src} src={photo.src} alt="" fetchPriority={i===0?'high':'auto'} loading={i<2?'eager':'lazy'} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] motion-reduce:transition-none ${active===i?'opacity-100':'opacity-0'}`} style={{objectPosition:photo.position}}/>)}</div>
  <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,37,29,.85)_0%,rgba(5,37,29,.52)_48%,rgba(5,37,29,.12)_100%)]"/>
  <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#092e29]/80 via-transparent to-black/20"/>
  <header className="mx-auto flex w-full max-w-[1800px] flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-10 lg:px-16 lg:py-9">
   <Link href="/" aria-label="MapAI — Inicio" className="flex items-center gap-2 text-4xl font-extrabold tracking-tight"><Compass strokeWidth={1.7} className="h-9 w-9"/>MapAI<span className="text-[#deeba9]">.</span></Link>
   <nav aria-label={t('Navegación principal')} className="flex flex-wrap items-center gap-3 sm:gap-6">
    <LanguageSwitch light/>
    <a href="#como-funciona" className="hidden text-sm font-semibold text-white/90 lg:block">{t('Cómo funciona')}</a>
    <button onClick={()=>signedIn?window.location.assign('/explore?view=profile'):setAuthOpen(true)} className="flex min-h-11 items-center gap-2 rounded-full border border-white/40 px-4 py-2 text-sm font-bold transition hover:bg-white/15"><UserRound size={17}/>{t(signedIn?'Mi cuenta':'Ingresar')}</button>
   </nav>
  </header>
  <section className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col justify-center px-6 pb-12 pt-10 sm:px-10 lg:px-16 lg:py-14">
   <p className="mb-8 text-[10px] font-extrabold uppercase tracking-[.26em] text-[#e1edb4] sm:mb-10 sm:text-xs">{t('Salí de la rutina. Encontrá tu ruta.')}</p>
   <h1 className="max-w-[1080px] text-[clamp(2.65rem,5.4vw,6.6rem)] font-bold leading-[1.08] tracking-[-.055em]">{t('Un poquito de aventura.')}<br/><span className="inline-block pt-3">{t('Un montón de')} <span className="text-[#e0eca8]">pura vida.</span></span></h1>
   <p className="mt-7 max-w-[760px] text-base leading-relaxed text-white/90 sm:mt-10 sm:text-lg lg:text-xl">{t('Montañas, playas y esos rincones que todavía no conocés. Armá un viaje que se sienta muy vos.')}</p>
   <div className="mt-9 flex flex-wrap gap-3 sm:mt-12">
    <Link href="/discover" className="flex min-h-16 w-full items-center justify-between gap-10 rounded-2xl bg-[#f5f6ea] px-7 py-5 font-bold text-[#214f43] shadow-lg transition hover:bg-white sm:w-auto sm:min-w-72">{t('Comenzar')}<ArrowUpRight size={22}/></Link>
    <Link href="/explore?view=trips" className="flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl border border-white/40 px-7 py-5 font-bold backdrop-blur-sm transition hover:bg-white/10 sm:w-auto">{t('Mis viajes')}<ArrowRight size={18}/></Link>
   </div>
  </section>
  <footer className="mx-auto flex w-full max-w-[1800px] flex-col justify-between gap-6 px-6 pb-7 sm:px-10 lg:flex-row lg:items-end lg:px-16 lg:pb-10">
   <div className="flex items-center gap-4"><button aria-label={t('Fotografía anterior')} onClick={()=>next(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 hover:bg-white/15"><ArrowLeft size={20}/></button><div className="flex gap-2">{heroSlides.map((p,i)=><button key={p.src} onClick={()=>setActive(i)} aria-label={`${t('Ver fotografía')} ${i+1}`} aria-pressed={active===i} className="flex h-11 items-center px-1"><span className={`block h-2 rounded-full transition-all ${active===i?'w-9 bg-[#dfeaa9]':'w-2 bg-white/45'}`}/></button>)}</div><button aria-label={t('Siguiente fotografía')} onClick={()=>next(1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 hover:bg-white/15"><ArrowRight size={20}/></button><span className="text-xs font-bold tracking-widest">0{active+1} <span className="text-white/50">/ 04</span></span><button onClick={()=>{if(reduced){setReduced(false);setPaused(false);}else setPaused(p=>!p);}} aria-label={t(paused||reduced?'Reproducir fotografías':'Pausar fotografías')} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40">{paused||reduced?<Play size={18}/>:<Pause size={18}/>}</button></div>
   <div className="max-w-lg text-xs sm:text-right"><p className="font-semibold text-white/95">⌖ {t(slide.title)}</p><a title={t('Fotos optimizadas en WebP; recorte adaptable.')} href={slide.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[10px] leading-relaxed text-white/65 hover:text-white">{t('Fotografía')}: {slide.source} ↗</a></div>
  </footer>
  <AuthModal isOpen={authOpen} onClose={()=>setAuthOpen(false)} onSuccess={()=>{setSignedIn(true);setAuthOpen(false);}}/>
  <section id="como-funciona" className="border-t border-white/15 bg-[#0e392f]/95 px-6 py-8 sm:px-10 lg:px-16"><div className="mx-auto grid max-w-[1660px] gap-5 sm:grid-cols-3">{[['01','Elegí tu próximo destino','Explorá naturaleza, aventura, cultura y gastronomía.'],['02','Armá un viaje a tu medida','Organizá los días, las paradas, tus notas y tu presupuesto.'],['03','Salí a descubrir','Iniciá el viaje, abrí Maps y marcá tus paradas completadas.']].map(([n,title,body])=><div key={n} className="flex gap-4"><span className="text-xs text-[#dfeaa9]">{n}</span><div><h2 className="text-sm font-bold">{t(title)}</h2><p className="mt-1 text-xs leading-relaxed text-white/60">{t(body)}</p></div></div>)}</div></section>
 </main>;
}
