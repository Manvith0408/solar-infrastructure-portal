import React from 'react';
import { Trash2, Users, Zap, Grid2X2, Sliders } from 'lucide-react';
import { CohortPayload } from '@/lib/api';
import { SOLAR_CONSTANTS } from '@/lib/constants';

interface CohortInputRowProps {
  index: number;
  cohort: CohortPayload;
  onChange: (updated: CohortPayload) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function CohortInputRow({
  index,
  cohort,
  onChange,
  onRemove,
  canRemove
}: CohortInputRowProps) {
  const isDirectKw = cohort.type === 'KW';

  // Extract counts or kw
  const applianceCounts = (!isDirectKw && typeof cohort.loadDetails === 'object' && cohort.loadDetails !== null
    ? (cohort.loadDetails as Record<string, number>)
    : { fan: 3, bulb: 5, tv: 1, fridge: 1, ac: 1 }) as Record<string, number>;

  const directKw = isDirectKw
    ? Number((cohort.loadDetails as { kw: number })?.kw || 2.5)
    : 2.5;

  const handleModeSwitch = (mode: 'APPLIANCE' | 'KW') => {
    if (mode === 'KW') {
      onChange({
        type: 'KW',
        houses: cohort.houses,
        loadDetails: { kw: 2.5 }
      });
    } else {
      onChange({
        type: 'APPLIANCE',
        houses: cohort.houses,
        loadDetails: { fan: 3, bulb: 6, tv: 1, fridge: 1, ac: 1 }
      });
    }
  };

  const handleHousesChange = (houses: number) => {
    onChange({
      ...cohort,
      houses: Math.max(1, houses)
    });
  };

  const handleApplianceChange = (appKey: string, val: number) => {
    const updatedCounts = {
      ...applianceCounts,
      [appKey]: Math.max(0, val)
    };
    onChange({
      ...cohort,
      loadDetails: updatedCounts
    });
  };

  const handleDirectKwChange = (kwVal: number) => {
    onChange({
      ...cohort,
      loadDetails: { kw: Math.max(0.1, kwVal) }
    });
  };

  // Compute cohort's daily kWh
  let dailyKwhPerHouse = 0;
  if (isDirectKw) {
    dailyKwhPerHouse = directKw * SOLAR_CONSTANTS.SOLAR_YIELD_KWH_PER_KW_DAY;
  } else {
    let wh = 0;
    for (const [key, spec] of Object.entries(SOLAR_CONSTANTS.APPLIANCE_SPECS)) {
      wh += (applianceCounts[key] || 0) * spec.watts * spec.defaultHours;
    }
    dailyKwhPerHouse = wh / 1000;
  }
  const totalCohortDailyKwh = dailyKwhPerHouse * cohort.houses;

  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 transition-all hover:border-slate-300">
      {/* Header Row: Index, Houses Count, Mode Toggle, Remove Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-mono font-bold text-xs flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-xs font-bold text-slate-800">
            Consumer Cohort #{index + 1}
          </span>
        </div>

        {/* Houses input */}
        <div className="flex items-center gap-2 text-xs">
          <label className="text-slate-500 font-semibold flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>Beneficiary Houses:</span>
          </label>
          <input
            type="number"
            min="1"
            value={cohort.houses}
            onChange={(e) => handleHousesChange(parseInt(e.target.value) || 1)}
            className="w-20 px-2.5 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-500"
          />
        </div>

        {/* Mode Toggle & Remove */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-0.5 rounded-lg bg-slate-200 text-xs">
            <button
              type="button"
              onClick={() => handleModeSwitch('APPLIANCE')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                !isDirectKw
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Appliance Mode
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('KW')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                isDirectKw
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Direct kW Mode
            </button>
          </div>

          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Remove Cohort"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cohort Load Detail Inputs */}
      {isDirectKw ? (
        <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-800">
              Direct Connected Load per House
            </span>
            <p className="text-[11px] text-slate-500">
              Contracted load sanction from Gov records
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="50"
              value={directKw}
              onChange={(e) => handleDirectKwChange(parseFloat(e.target.value) || 1)}
              className="w-24 px-3 py-1.5 font-mono font-bold text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-right focus:outline-none focus:border-slate-500"
            />
            <span className="text-xs font-bold text-slate-600 font-mono">kW / house</span>
          </div>
        </div>
      ) : (
        /* Appliance Mode Stepper Controls */
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
          {[
            { id: 'fan', label: 'Fan (75W)' },
            { id: 'bulb', label: 'Bulb (10W)' },
            { id: 'tv', label: 'TV (100W)' },
            { id: 'fridge', label: 'Fridge (200W)' },
            { id: 'ac', label: 'AC (1500W)' }
          ].map((app) => (
            <div key={app.id} className="p-2 rounded bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-semibold">{app.label}</span>
              <div className="flex items-center justify-between mt-1.5">
                <button
                  type="button"
                  onClick={() => handleApplianceChange(app.id, (applianceCounts[app.id] || 0) - 1)}
                  className="w-5 h-5 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                >
                  -
                </button>
                <span className="font-mono font-bold text-slate-900">
                  {applianceCounts[app.id] || 0}
                </span>
                <button
                  type="button"
                  onClick={() => handleApplianceChange(app.id, (applianceCounts[app.id] || 0) + 1)}
                  className="w-5 h-5 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cohort Subtotal Footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-mono">
        <span>
          Daily Run: ~<strong>{dailyKwhPerHouse.toFixed(1)} kWh</strong> per household
        </span>
        <span className="text-slate-700 font-semibold">
          Total Cohort Daily: <strong className="text-emerald-700">{totalCohortDailyKwh.toFixed(1)} kWh/day</strong>
        </span>
      </div>
    </div>
  );
}
