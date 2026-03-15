'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { LogIn, LogOut, User } from 'lucide-react';

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--color-glass)] text-xs text-[var(--color-text-muted)]">
        <div className="w-4 h-4 rounded-full border-2 border-[var(--color-text-muted)] border-t-transparent animate-spin" />
        Chargement...
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--color-glass)] border border-[var(--color-glass-border)]">
          {session.user.image ? (
            <img src={session.user.image} alt="" className="w-6 h-6 rounded-full" />
          ) : (
            <User size={14} className="text-[var(--color-accent)]" />
          )}
          <span className="text-xs font-medium text-white/80 hidden sm:inline">{session.user.name?.split(' ')[0]}</span>
        </div>
        <button
          onClick={() => signOut()}
          className="p-1.5 rounded-lg bg-[var(--color-glass)] hover:bg-red-500/20 text-[var(--color-text-muted)] hover:text-red-400 transition-all"
          title="Déconnexion"
        >
          <LogOut size={14} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn('google')}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-semibold hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/20"
    >
      <LogIn size={14} />
      <span className="hidden sm:inline">Google</span>
    </button>
  );
}
