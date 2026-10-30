'use client';
import { useLanguage } from '@/lib/i18n';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Sparkles, LogIn, Mail, Lock, CheckCircle2, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setErrorMsg(null);
    setEmailConfirmationSent(false);
    setLoading(false);
    onClose();
  };

  const handleOAuthLogin = async (provider: 'google') => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}`,
        },
      });
      if (error) setErrorMsg(error.message);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al conectar con Google');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
        } else if (data?.user && !data?.session) {
          setEmailConfirmationSent(true);
        } else if (data?.session) {
          if (onSuccess) onSuccess();
          handleClose();
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes('Email not confirmed')) {
            setErrorMsg(t("Tu correo electrónico aún no ha sido verificado. Por favor revisá tu bandeja de entrada o spam."));
          } else {
            setErrorMsg(t("Correo o contraseña incorrectos."));
          }
        } else if (data?.session) {
          if (onSuccess) onSuccess();
          handleClose();
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-900 dark:text-slate-100 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {emailConfirmationSent ? t("Verificá tu Correo") : isSignUp ? t("Crear Cuenta") : t("Iniciar Sesión")}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">MapAI · Costa Rica</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Estado 1: Pantalla de Confirmación de Correo */}
        {emailConfirmationSent ? (
          <div className="py-4 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {t(" ¡Enlace de Activación Enviado! ")}</h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {t(" Enviamos un correo a ")}<strong className="text-emerald-600 dark:text-emerald-400">{email}</strong>{t(". Por favor abrí el enlace para activar tu cuenta en MapAI. ")}</p>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 text-left">
              {t(" 💡 Si no lo encontrás en un par de minutos, revisá tu carpeta de ")}<strong>{t("Spam / Correo no deseado")}</strong>.
            </div>
            <button
              onClick={() => {
                setEmailConfirmationSent(false);
                setIsSignUp(false);
              }}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <span>{t("Ir a Iniciar Sesión")}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            {/* Botón Google OAuth */}
            <button
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>{t("Continuar con Google")}</span>
            </button>

            <div className="relative flex items-center justify-center">
              <hr className="w-full border-slate-200 dark:border-slate-800" />
              <span className="absolute px-2 bg-white dark:bg-slate-900 text-[10px] text-slate-400 font-semibold uppercase">
                {t(" o con correo ")}</span>
            </div>

            {/* Formulario Correo / Contraseña */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {errorMsg && (
                <p className="text-[10px] text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800/40 font-medium leading-tight">
                  ⚠️ {t(errorMsg)}
                </p>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{t("Correo Electrónico")}</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{t("Contraseña")}</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{loading ? 'Procesando...' : isSignUp ? 'Registrarme' : t("Iniciar Sesión")}</span>
              </button>
            </form>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMsg(null);
                }}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
              >
                {isSignUp ? t("¿Ya tenés cuenta? Iniciá sesión") : t("¿No tenés cuenta? Registrate gratis")}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}