'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import translations from './translations.json';
export type Language='es'|'en';
export function translate(text:string,language:Language):string { if(language==='es')return text;
 const direct=(translations as Record<string,string>)[text];if(direct)return direct;
 const trimmed=text.trim(),match=(translations as Record<string,string>)[trimmed];
 if(match)return text.replace(trimmed,match);
 return text.replace(/^Agregado a «(.+)», día (\d+)\.$/,'Added to “$1”, day $2.')
 .replace(/^Guardar Viaje \((.+) Est\.\)$/,'Save trip ($1 estimated)')
 .replace(/^Día de parada (\d+)$/,'Day for stop $1')
 .replace(/^Parada (\d+)$/,'Stop $1')
 .replace(/^Parada #(\d+)$/,'Stop #$1')
 .replace(/^Completar /,'Complete ').replace(/^Desmarcar /,'Uncheck ')
 .replace(/^Estimado: /,'Estimated: '); }
const Context=createContext({language:'es' as Language,setLanguage:(_language:Language)=>{},t:(text:string)=>text});
export function LanguageProvider({children}:{children:ReactNode}) {
 const [language,setLanguageState]=useState<Language>('es');
 useEffect(()=>{try { const saved=localStorage.getItem('pi:language'); if(saved==='en')queueMicrotask(()=>setLanguageState('en')); }catch{}},[]);
 useEffect(()=>{document.documentElement.lang=language;},[language]);
 const setLanguage=(next:Language)=>{setLanguageState(next);try{localStorage.setItem('pi:language',next);}catch{}};
 return <Context.Provider value={{language,setLanguage,t:text=>translate(text,language)}}>{children}</Context.Provider>;
}
export const useLanguage=()=>useContext(Context);
export function LanguageSwitch({light=false}:{light?:boolean}) {
 const {language,setLanguage}=useLanguage();
 return <div role="group" aria-label="Language / Idioma" className={`inline-flex rounded-full border p-1 text-xs ${light?'border-white/30 bg-black/15 text-white backdrop-blur-xl':'border-slate-200 bg-white text-emerald-950'}`}>{(['es','en'] as const).map(l=><button key={l} aria-pressed={language===l} onClick={()=>setLanguage(l)} className={`min-h-10 rounded-full px-3 font-bold transition-colors ${language===l?'bg-[#f4f5e6] text-[#1b493d]':''}`}>{l==='es'?'ES · Español':'EN · English'}</button>)}</div>;
}
