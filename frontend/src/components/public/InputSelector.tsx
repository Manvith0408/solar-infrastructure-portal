import React from 'react';
import { motion } from 'framer-motion';
import { Receipt, Grid2X2, Sparkles } from 'lucide-react';

interface InputSelectorProps {
  mode: 'BILL' | 'APPLIANCES';
  onChangeMode: (mode: 'BILL' | 'APPLIANCES') => void;
}

export function InputSelector({ mode, onChangeMode }: InputSelectorProps) {
  return (
    <div className="w-full flex flex-col items-center">
      <div className="inline-flex p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner">
        {/* Monthly Bill Toggle Button */}
        <button
          type="button"
          onClick={() => onChangeMode('BILL')}
          className={`relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
            mode === 'BILL' ? 'text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {mode === 'BILL' && (
            <motion.div
              layoutId="activePill"
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 shadow-[0_0_20px_rgba(132,204,22,0.4)]"
              transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            <span>Monthly Bill (kWh)</span>
          </span>
        </button>

        {/* Appliance Wizard Toggle Button */}
        <button
          type="button"
          onClick={() => onChangeMode('APPLIANCES')}
          className={`relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
            mode === 'APPLIANCES' ? 'text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {mode === 'APPLIANCES' && (
            <motion.div
              layoutId="activePill"
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 shadow-[0_0_20px_rgba(132,204,22,0.4)]"
              transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Grid2X2 className="w-4 h-4" />
            <span>Appliance Counter</span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-950/20 font-extrabold flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> Wizard
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
