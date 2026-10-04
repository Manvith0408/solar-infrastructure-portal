'use client';

import React from 'react';
import Link from 'next/link';
import { Sun, ShieldCheck, ArrowRight, Zap, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Header() {
  const { currentUser, userRole, signInWithGoogle, logout, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-lime-500 to-emerald-400 p-0.5 shadow-[0_0_20px_rgba(132,204,22,0.4)]">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sun className="w-5 h-5 text-lime-400 animate-spin-slow" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">
                SOLAR<span className="text-lime-400">PULSE</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-lime-500/10 text-lime-400 border border-lime-500/30">
                <Zap className="w-2.5 h-2.5" /> B2C Sizing Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              PM Surya Ghar: Muft Bijli Yojana Integrated Engine
            </p>
          </div>
        </Link>

        {/* Action Controls & Auth State */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 mr-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>MNRE Accredited</span>
          </div>

          {/* User Auth Section (Profile Widget correctly aligned at the far right when logged in) */}
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-lime-400" />
              <span>Verifying...</span>
            </div>
          ) : currentUser ? (
            /* Logged In State: User Avatar + Name + Role + Logout Button */
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1.5 pr-2.5 rounded-xl">
              {currentUser.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Citizen'}
                  className="w-7 h-7 rounded-lg object-cover border border-lime-400/40"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-lime-400/20 text-lime-400 border border-lime-400/30 flex items-center justify-center font-bold text-xs uppercase">
                  {currentUser.displayName?.[0] || currentUser.email?.[0] || 'C'}
                </div>
              )}

              <div className="hidden sm:block text-left text-[11px] leading-tight">
                <div className="font-semibold text-white max-w-[120px] truncate">
                  {currentUser.displayName || 'Citizen User'}
                </div>
                <div className="text-slate-400 text-[10px] font-mono">
                  {userRole === 'ADMIN' ? 'State Admin' : 'Public Citizen'}
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                title="Logout from session"
                className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Logged Out State: Google Sign-in Button */}
              <button
                type="button"
                onClick={() => signInWithGoogle()}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 transition-all shadow-sm cursor-pointer"
              >
                {/* Google G SVG */}
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign In</span>
              </button>

              {/* Login Page Link */}
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold transition-all shadow-[0_0_15px_rgba(132,204,22,0.3)] cursor-pointer"
              >
                <span>Login Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
