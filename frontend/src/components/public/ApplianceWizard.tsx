import React from 'react';
import { motion } from 'framer-motion';
import { Fan, Lightbulb, Tv, Refrigerator, AirVent, Plus, Minus, Zap } from 'lucide-react';
import { SOLAR_CONSTANTS } from '@/lib/constants';

interface ApplianceWizardProps {
  counts: Record<string, number>;
  onCountChange: (appliance: string, newCount: number) => void;
}

const APPLIANCE_LIST = [
  {
    id: 'fan',
    name: 'Ceiling Fan',
    watts: SOLAR_CONSTANTS.APPLIANCE_SPECS.fan.watts, // 75W
    hours: SOLAR_CONSTANTS.APPLIANCE_SPECS.fan.defaultHours, // 10h
    icon: Fan,
    color: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-cyan-400'
  },
  {
    id: 'bulb',
    name: 'LED Bulb',
    watts: SOLAR_CONSTANTS.APPLIANCE_SPECS.bulb.watts, // 10W
    hours: SOLAR_CONSTANTS.APPLIANCE_SPECS.bulb.defaultHours, // 6h
    icon: Lightbulb,
    color: 'from-yellow-500/20 to-amber-500/20',
    iconColor: 'text-amber-400'
  },
  {
    id: 'tv',
    name: 'Smart TV',
    watts: SOLAR_CONSTANTS.APPLIANCE_SPECS.tv.watts, // 100W
    hours: SOLAR_CONSTANTS.APPLIANCE_SPECS.tv.defaultHours, // 5h
    icon: Tv,
    color: 'from-purple-500/20 to-pink-500/20',
    iconColor: 'text-purple-400'
  },
  {
    id: 'fridge',
    name: 'Refrigerator',
    watts: SOLAR_CONSTANTS.APPLIANCE_SPECS.fridge.watts, // 200W
    hours: SOLAR_CONSTANTS.APPLIANCE_SPECS.fridge.defaultHours, // 12h
    icon: Refrigerator,
    color: 'from-emerald-500/20 to-teal-500/20',
    iconColor: 'text-emerald-400'
  },
  {
    id: 'ac',
    name: 'Inverter AC',
    watts: SOLAR_CONSTANTS.APPLIANCE_SPECS.ac.watts, // 1500W
    hours: SOLAR_CONSTANTS.APPLIANCE_SPECS.ac.defaultHours, // 6h
    icon: AirVent,
    color: 'from-rose-500/20 to-orange-500/20',
    iconColor: 'text-rose-400'
  }
];

export function ApplianceWizard({ counts, onCountChange }: ApplianceWizardProps) {
  // Calculate summary connected load
  const totalWatts = APPLIANCE_LIST.reduce((sum, item) => {
    return sum + (counts[item.id] || 0) * item.watts;
  }, 0);

  const totalDailyKwh = APPLIANCE_LIST.reduce((sum, item) => {
    return sum + ((counts[item.id] || 0) * item.watts * item.hours) / 1000;
  }, 0);

  return (
    <div className="w-full space-y-4">
      {/* Visual Appliance Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {APPLIANCE_LIST.map((item) => {
          const count = counts[item.id] || 0;
          const Icon = item.icon;
          const isActive = count > 0;

          return (
            <motion.div
              key={item.id}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
              className={`relative flex flex-col justify-between p-4 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'glass-card-active shadow-[0_0_20px_rgba(132,204,22,0.15)] ring-1 ring-lime-400/40'
                  : 'glass-card-dark hover:border-slate-700'
              }`}
            >
              {/* Top Row: Icon & Wattage */}
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center border border-white/5`}
                >
                  <Icon className={`w-5 h-5 ${item.iconColor}`} />
                </div>
                <div className="text-right">
                  <span className="inline-block text-[11px] font-mono font-bold text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded-full border border-lime-400/20">
                    {item.watts}W
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">{item.hours}h / day</div>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-white tracking-tight">{item.name}</h4>
                <p className="text-[11px] text-slate-400">
                  {count > 0 ? `${count * item.watts}W load` : '0 active'}
                </p>
              </div>

              {/* Stepper Controls */}
              <div className="flex items-center justify-between bg-slate-950/60 rounded-xl p-1.5 border border-slate-800/80">
                <button
                  type="button"
                  onClick={() => onCountChange(item.id, Math.max(0, count - 1))}
                  disabled={count <= 0}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  aria-label={`Decrease ${item.name}`}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <span className="text-base font-bold font-mono text-white px-2 min-w-[28px] text-center">
                  {count}
                </span>

                <button
                  type="button"
                  onClick={() => onCountChange(item.id, count + 1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-lime-500/20 text-lime-300 hover:bg-lime-500/30 hover:text-lime-200 border border-lime-500/30 transition-colors cursor-pointer"
                  aria-label={`Increase ${item.name}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Aggregate Connected Load Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Zap className="w-4 h-4 text-lime-400" />
          <span>
            Total Peak Load: <strong className="text-white font-mono">{totalWatts} Watts</strong> (
            {(totalWatts / 1000).toFixed(2)} kW)
          </span>
        </div>
        <div className="text-slate-400">
          Est. Daily Generation Needed:{' '}
          <strong className="text-lime-400 font-mono font-bold">
            {totalDailyKwh.toFixed(1)} kWh/day
          </strong>
        </div>
      </div>
    </div>
  );
}
