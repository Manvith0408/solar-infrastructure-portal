import React from 'react';
import Link from 'next/link';
import {
  Users,
  FileSpreadsheet,
  Globe,
  Sun,
  ShieldCheck,
  Building2,
  Cpu
} from 'lucide-react';

interface AdminSidebarProps {
  currentTab: 'crm' | 'dpr';
  onTabChange: (tab: 'crm' | 'dpr') => void;
  pendingCount?: number;
}

export function AdminSidebar({ currentTab, onTabChange, pendingCount = 0 }: AdminSidebarProps) {
  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-md">
            <Sun className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span>GOV</span>
              <span className="text-yellow-400 font-bold">GRID</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">
              B2G Infrastructure & DPR
            </p>
          </div>
        </div>
      </div>

      {/* Gov Station Info */}
      <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-yellow-400" />
          <span className="font-semibold text-slate-300">MNRE State Nodal</span>
        </div>
        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[10px]">
          LIVE
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1">
        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-3 py-2">
          Management Modules
        </div>

        <button
          type="button"
          onClick={() => onTabChange('crm')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            currentTab === 'crm'
              ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Users className={`w-4 h-4 ${currentTab === 'crm' ? 'text-yellow-400' : 'text-slate-400'}`} />
            <span>Lead CRM & Radar</span>
          </div>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onTabChange('dpr')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            currentTab === 'dpr'
              ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet
              className={`w-4 h-4 ${currentTab === 'dpr' ? 'text-yellow-400' : 'text-slate-400'}`}
            />
            <span>Area DPR Generator</span>
          </div>
          <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            Split-Pane
          </span>
        </button>
      </nav>

      {/* Footer Switcher to B2C Public Portal */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <Link
          href="/"
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Public B2C Portal</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">→</span>
        </Link>

        <div className="mt-3 flex items-center gap-1.5 px-2 text-[10px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Statutory Gov Planning Tool</span>
        </div>
      </div>
    </aside>
  );
}
