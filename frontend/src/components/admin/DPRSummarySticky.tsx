import React from 'react';
import {
  FileDown,
  AlertTriangle,
  CheckCircle2,
  Zap,
  MapPin,
  Building,
  Loader2,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { formatINR, SOLAR_CONSTANTS } from '@/lib/constants';

interface DPRSummaryStickyProps {
  areaName: string;
  availableLandAcres: number;
  distanceToSubstation: number;
  totalHouses: number;
  totalDailyKwh: number;
  baseRequiredKw: number;
  totalRequiredKw: number;
  requiredLandAcres: number;
  landFeasible: boolean;
  solarBudget: number;
  transmissionCost: number;
  totalBudget: number;
  isGeneratingPdf: boolean;
  onGeneratePdf: () => void;
}

export function DPRSummarySticky({
  areaName,
  availableLandAcres,
  distanceToSubstation,
  totalHouses,
  totalDailyKwh,
  baseRequiredKw,
  totalRequiredKw,
  requiredLandAcres,
  landFeasible,
  solarBudget,
  transmissionCost,
  totalBudget,
  isGeneratingPdf,
  onGeneratePdf
}: DPRSummaryStickyProps) {
  const landDeficit = Math.max(0, requiredLandAcres - availableLandAcres);

  return (
    <div className="sticky top-6 rounded-2xl bg-white border border-slate-200 shadow-md p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Real-Time Feasibility Engine
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
            1 kW = 4 kWh/day
          </span>
        </div>
        <h3 className="text-base font-bold text-slate-900 mt-1 truncate">
          {areaName || 'Untitled Project Feeder'}
        </h3>
        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>Substation Intertie: {distanceToSubstation || 0} km</span>
        </p>
      </div>

      {/* Aggregate KPI Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Beneficiary Houses
          </span>
          <span className="font-mono text-xl font-bold text-slate-900 mt-0.5 block">
            {totalHouses}
          </span>
          <span className="text-[10px] text-slate-500">Connected consumer loads</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Total Daily Demand
          </span>
          <span className="font-mono text-xl font-bold text-slate-900 mt-0.5 block">
            {totalDailyKwh.toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-500">kWh</span>
          </span>
          <span className="text-[10px] text-slate-500">Gross consumption audit</span>
        </div>
      </div>

      {/* Capacity & Feeder Loss Breakdown */}
      <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Base Solar Capacity (Daily kWh / 4):</span>
          <span className="font-mono font-bold">{baseRequiredKw.toFixed(1)} kW</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-amber-400 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>Feeder & Line Loss (+10%):</span>
          </span>
          <span className="font-mono text-amber-400 font-bold">
            +{(totalRequiredKw - baseRequiredKw).toFixed(1)} kW
          </span>
        </div>
        <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Total Sized Solar Plant:
          </span>
          <div className="text-right">
            <span className="text-2xl font-black font-mono text-yellow-400">
              {totalRequiredKw.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-yellow-400 ml-1">kW</span>
          </div>
        </div>
      </div>

      {/* Land Check & Constraint Verification */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700">Land Allocation Check:</span>
          <span className="text-slate-500 font-mono text-[11px]">
            Statutory 4 Acres / 1000 kW
          </span>
        </div>

        {/* Dynamic Status Alert Badge */}
        {landFeasible ? (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-start gap-3 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <strong className="font-bold text-emerald-900 block">
                ✓ LAND FEASIBLE: ADEQUATE PARCEL AVAILABLE
              </strong>
              <p className="text-emerald-700 text-[11px]">
                Available <strong>{availableLandAcres} Acres</strong> satisfies the required{' '}
                <strong>{requiredLandAcres.toFixed(2)} Acres</strong> (Surplus of{' '}
                {(availableLandAcres - requiredLandAcres).toFixed(2)} Acres).
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-800 flex items-start gap-3 shadow-xs animate-pulse">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <strong className="font-bold text-red-900 block flex items-center gap-1">
                ⚠ INSUFFICIENT LAND: DEFICIT OF {landDeficit.toFixed(2)} ACRES
              </strong>
              <p className="text-red-700 text-[11px]">
                Project requires <strong>{requiredLandAcres.toFixed(2)} Acres</strong>, but only{' '}
                <strong>{availableLandAcres} Acres</strong> is earmarked. Additional parcel or cohort
                reduction required.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Financial Capex Breakdown */}
      <div className="space-y-2 border-t border-slate-100 pt-4 text-xs">
        <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
          Statutory Capital Outlay (CapEx)
        </span>
        <div className="flex items-center justify-between text-slate-600">
          <span>Solar PV System (@ ₹60k/kW):</span>
          <span className="font-mono font-semibold">{formatINR(solarBudget)}</span>
        </div>
        <div className="flex items-center justify-between text-slate-600">
          <span>Substation Grid Intertie Line ({distanceToSubstation} km):</span>
          <span className="font-mono font-semibold">{formatINR(transmissionCost)}</span>
        </div>
        <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between text-slate-900 font-bold">
          <span>Total Project Budget:</span>
          <span className="font-mono text-base text-slate-900">
            {formatINR(totalBudget)}
          </span>
        </div>
      </div>

      {/* Massive Generate Official PDF DPR Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onGeneratePdf}
          disabled={isGeneratingPdf || totalRequiredKw <= 0}
          className="w-full relative group overflow-hidden flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-white font-bold bg-slate-900 hover:bg-slate-800 active:scale-[0.99] transition-all duration-200 shadow-xl disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          {isGeneratingPdf ? (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
              <span>Generating Government PDF DPR...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <FileDown className="w-5 h-5 text-yellow-400 group-hover:translate-y-0.5 transition-transform" />
              <span>Generate Official PDF DPR</span>
            </div>
          )}
        </button>

        <p className="text-[11px] text-center text-slate-400 mt-2">
          Outputs certified PDF buffer with Gov seal, engineering calculations, and sign-off blocks.
        </p>
      </div>
    </div>
  );
}
