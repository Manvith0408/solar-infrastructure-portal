'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { RefreshCw, LogOut, ShieldCheck, User } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  subtitle: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function AdminHeader({ title, subtitle, onRefresh, isLoading }: AdminHeaderProps) {
  const { currentUser, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login?tab=official');
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
            <span>Sync Data</span>
          </button>
        )}

        <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

        {/* Admin Panel Badge & Identity */}
        <div className="flex items-center gap-2">
          <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3 text-amber-600" />
            <span>Admin Panel</span>
          </span>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 font-mono">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="max-w-[150px] truncate">{currentUser?.email || 'admin@gov.in'}</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-red-600" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
