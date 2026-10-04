'use client';

import React from 'react';
import { Mail, Phone, Sun, GraduationCap, User, Sparkles, ExternalLink, ShieldCheck, Zap } from 'lucide-react';

interface AboutCreatorProps {
  onClose?: () => void;
}

export function AboutCreator({ onClose }: AboutCreatorProps) {
  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl bg-slate-950/95 border border-slate-800/90 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.7)] text-slate-200 relative overflow-hidden">
      {/* Decorative Radial Glows */}
      <div className="absolute -top-20 -right-20 w-56 h-56 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-lime-400 to-emerald-500 p-0.5 shadow-[0_0_25px_rgba(132,204,22,0.35)]">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-extrabold text-xl sm:text-2xl text-lime-400">
                MA
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-lime-400 border-2 border-slate-950 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-slate-950" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Manvith A A</h2>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/30">
                Creator
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Full-Stack &amp; Hardware Systems Engineer
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        )}
      </div>

      {/* Project Info & Mission */}
      <div className="py-6 space-y-4 border-b border-slate-800/70">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-lime-400 font-mono">
            <Sun className="w-4 h-4" />
            <span>Project Title</span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1 tracking-tight">
            Solar Infrastructure Portal
          </h3>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Platform Mission</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            A dual-pipeline MERN platform designed to automate PM Surya Ghar solar subsidy calculations for citizens and generate government-grade Detailed Project Reports (DPR) for officials.
          </p>
        </div>
      </div>

      {/* Developer Background */}
      <div className="py-6 space-y-2 border-b border-slate-800/70">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
          <GraduationCap className="w-4 h-4 text-lime-400" />
          <span>Creator Background</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Engineering student at <strong className="text-white font-semibold">KS Institute of Technology</strong>, specializing in Full-Stack Development and Hardware Systems Integration.
        </p>
      </div>

      {/* Interactive Contact Section */}
      <div className="pt-6 space-y-3 bg-gradient-to-b from-slate-900/50 to-slate-900/90 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-6 sm:p-8 rounded-b-3xl border-t border-slate-800/80">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-lime-400 font-mono">
            Contact
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Connect directly for collaboration, inquiries, or technical discussion.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Phone Link */}
          <a
            href="tel:+916361319826"
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 text-slate-300 hover:text-lime-400 hover:border-lime-400/50 hover:bg-slate-900/90 hover:shadow-[0_0_20px_rgba(132,204,22,0.15)] transition-all duration-200 group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-lime-400 group-hover:border-lime-400/40 transition-colors">
              <Phone size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase font-mono text-slate-500 group-hover:text-lime-400/80 transition-colors">
                Phone
              </div>
              <div className="text-xs font-semibold truncate group-hover:text-white transition-colors">
                +91 6361319826
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-lime-400 transition-colors mr-1" />
          </a>

          {/* Email Link */}
          <a
            href="mailto:manvithsgr@zohomail.in"
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 text-slate-300 hover:text-lime-400 hover:border-lime-400/50 hover:bg-slate-900/90 hover:shadow-[0_0_20px_rgba(132,204,22,0.15)] transition-all duration-200 group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-lime-400 group-hover:border-lime-400/40 transition-colors">
              <Mail size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase font-mono text-slate-500 group-hover:text-lime-400/80 transition-colors">
                Email
              </div>
              <div className="text-xs font-semibold truncate group-hover:text-white transition-colors">
                manvithsgr@zohomail.in
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-lime-400 transition-colors mr-1" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default AboutCreator;
