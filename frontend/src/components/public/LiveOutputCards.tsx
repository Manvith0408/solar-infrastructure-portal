import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Sun, BatteryCharging, IndianRupee, Gift, CheckCircle2, TrendingUp } from 'lucide-react';
import { formatINR } from '@/lib/constants';

interface SizingOutputProps {
  data: {
    calculatedKw: number;
    batteryBackupKwh: number;
    grossCost: number;
    subsidyAmount: number;
    netCost: number;
    meterNumber?: string;
    sizingDetails?: {
      dailyKwh: number;
      monthlySavingsEst: number;
    };
  };
}

export function LiveOutputCards({ data }: SizingOutputProps) {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05
      }
    }
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 24, scale: 0.96 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 260, damping: 20 }
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* 4 Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Card 1: Recommended System Size (kW) */}
        <motion.div
          variants={cardVariants}
          className="relative overflow-hidden p-5 rounded-2xl glass-card-dark border-lime-500/20 hover:border-lime-500/40 transition-all duration-300 group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-lime-500/10 rounded-full blur-2xl group-hover:bg-lime-500/20 transition-all" />
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              System Capacity
            </span>
            <div className="w-8 h-8 rounded-lg bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-400">
              <Sun className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {data.calculatedKw.toFixed(1)}
            </span>
            <span className="text-sm font-bold text-lime-400">kW</span>
          </div>

          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-lime-400" />
            Generates ~{(data.calculatedKw * 4).toFixed(0)} units (kWh) / day
          </p>

          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            Benchmark: 1 kW = 4 kWh/day solar yield
          </div>
        </motion.div>

        {/* Card 2: Battery Backup (kWh) */}
        <motion.div
          variants={cardVariants}
          className="relative overflow-hidden p-5 rounded-2xl glass-card-dark border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all" />

          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Battery Storage
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <BatteryCharging className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {data.batteryBackupKwh.toFixed(1)}
            </span>
            <span className="text-sm font-bold text-cyan-400">kWh</span>
          </div>

          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />
            Provides ~8 hours night-load autonomy
          </p>

          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            Lithium Ferro Phosphate (LFP) Sizing
          </div>
        </motion.div>

        {/* Card 3: Gross Project Cost */}
        <motion.div
          variants={cardVariants}
          className="relative overflow-hidden p-5 rounded-2xl glass-card-dark border-slate-700/60 hover:border-slate-600 transition-all duration-300 group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/10 rounded-full blur-2xl group-hover:bg-slate-500/20 transition-all" />

          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Gross EPC Cost
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-200 tracking-tight">
              {formatINR(data.grossCost)}
            </span>
          </div>

          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400" />
            Turnkey installation @ ₹60,000 / kW
          </p>

          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            Excluding central govt subsidies
          </div>
        </motion.div>

        {/* Card 4: Net Cost after PM Surya Ghar Subsidy */}
        <motion.div
          variants={cardVariants}
          className="relative overflow-hidden p-5 rounded-2xl glass-card-dark border-emerald-500/40 bg-gradient-to-b from-slate-900/90 to-emerald-950/20 hover:border-emerald-500/60 transition-all duration-300 group shadow-[0_0_30px_rgba(16,185,129,0.15)]"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/15 rounded-full blur-2xl group-hover:bg-emerald-500/25 transition-all" />

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Net Consumer Cost
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold flex items-center gap-0.5">
                <Gift className="w-2.5 h-2.5" /> Subsidy
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-3xl font-extrabold font-mono text-emerald-300 tracking-tight">
              {formatINR(data.netCost)}
            </span>
          </div>

          <p className="text-xs text-emerald-400/90 font-medium flex items-center gap-1.5 mt-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Includes {formatINR(data.subsidyAmount)} Direct PM Subsidy
          </p>

          <div className="mt-3 pt-3 border-t border-emerald-500/20 text-[11px] text-emerald-300/70 flex items-center justify-between">
            <span>ROI Payback: ~3.2 Years</span>
            <span className="flex items-center gap-0.5 text-lime-400">
              <TrendingUp className="w-3 h-3" /> Zero Bill
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Demand Radar Status Bar */}
      {data.meterNumber && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Demand Radar Reference:</span>
            <span className="font-mono font-bold text-lime-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {data.meterNumber}
            </span>
          </div>
          <div className="text-slate-400">
            Estimated Monthly Electricity Bill Savings:{' '}
            <strong className="text-white font-mono">
              {formatINR(data.sizingDetails?.monthlySavingsEst || Math.round(data.calculatedKw * 4 * 30 * 8.5))}
            </strong>
            /mo
          </div>
        </div>
      )}
    </div>
  );
}
