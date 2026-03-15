'use client';

import { signIn } from 'next-auth/react';
import { Clock, FileText, Shield, ArrowRight } from 'lucide-react';

const FEATURES = [
  {
    icon: Clock,
    title: 'Suivi précis',
    desc: 'Entrées d\'heures rapides avec overtime et jours fériés automatiques.',
  },
  {
    icon: FileText,
    title: 'Facturation pro',
    desc: 'Génération de factures avec TPS/TVQ et envoi par email en un clic.',
  },
  {
    icon: Shield,
    title: 'Données sécurisées',
    desc: 'Sauvegarde automatique sur ton Google Drive personnel.',
  },
];

export default function LandingPage() {
  return (
    <div className="landing-page min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Hero glow effects */}
      <div className="landing-glow landing-glow-1" />
      <div className="landing-glow landing-glow-2" />
      <div className="landing-glow landing-glow-3" />

      {/* Logo + Brand */}
      <div className="relative z-10 text-center mb-12 landing-fade-in">
        <div className="inline-flex items-center gap-4 mb-6">
          <div className="landing-logo">
            <svg viewBox="0 0 40 40" width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 8h24v4.5H17.5L32 28.5V32H8v-4.5h14.5L8 11.5V8z" fill="white" />
              <circle cx="33" cy="7" r="3" fill="#a78bfa" opacity="0.9" />
            </svg>
          </div>
          <div className="w-[3px] h-12 bg-indigo-500 rounded-full" />
          <div className="text-left">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              <span className="landing-brand-text">Zairi ERP</span>
            </h1>
            <p className="text-[10px] md:text-xs font-bold text-indigo-400 tracking-[0.25em] uppercase">
              Software Solutions
            </p>
          </div>
        </div>
        <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-md mx-auto leading-relaxed">
          Gestion d&apos;heures.<br />
          <span className="text-white/90 font-semibold">Facturation simplifiée.</span>
        </p>
      </div>

      {/* Features */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full mb-12 landing-fade-in landing-fade-delay-1">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={i}
              className="landing-feature-card glass-card p-5 text-center group"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/10 mb-3 group-hover:scale-110 transition-transform duration-300">
                <Icon size={22} className="text-[var(--color-accent-3)]" />
              </div>
              <h3 className="font-bold text-sm text-white mb-1">{f.title}</h3>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{f.desc}</p>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="relative z-10 landing-fade-in landing-fade-delay-2">
        <button
          onClick={() => signIn('google')}
          className="landing-cta group flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold text-base transition-all duration-300"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Se connecter avec Google
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
        <p className="text-center text-[10px] text-[var(--color-text-muted)] mt-4 max-w-xs mx-auto">
          Tes données restent privées sur ton propre Google Drive.
          Aucune information n&apos;est partagée.
        </p>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center z-10">
        <p className="text-[10px] text-[var(--color-text-muted)]">
          © {new Date().getFullYear()} Zairi Solutions
        </p>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-1 opacity-60">
          514-570-0598
        </p>
      </div>
    </div>
  );
}
