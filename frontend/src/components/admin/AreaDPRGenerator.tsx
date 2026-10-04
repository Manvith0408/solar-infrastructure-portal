import React, { useState, useMemo } from 'react';
import { Plus, Sparkles, AlertCircle, CheckCircle, FileText, Download } from 'lucide-react';
import { CohortInputRow } from './CohortInputRow';
import { DPRSummarySticky } from './DPRSummarySticky';
import { CohortPayload, generateAndDownloadDPR } from '@/lib/api';
import { SOLAR_CONSTANTS } from '@/lib/constants';
import { useAuth } from '@/context/AuthContext';

export function AreaDPRGenerator() {
  const { getIdToken } = useAuth();
  const [areaName, setAreaName] = useState<string>('Rampur Agro Feeder-04');
  const [availableLandAcres, setAvailableLandAcres] = useState<number>(6.0);
  const [distanceToSubstation, setDistanceToSubstation] = useState<number>(3.5);

  const [cohorts, setCohorts] = useState<CohortPayload[]>([
    {
      type: 'KW',
      houses: 45,
      loadDetails: { kw: 3.0 }
    },
    {
      type: 'APPLIANCE',
      houses: 80,
      loadDetails: { fan: 3, bulb: 6, tv: 1, fridge: 1, ac: 1 }
    }
  ]);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Dynamic calculations in real time
  const dprMath = useMemo(() => {
    let totalDailyKwh = 0;
    let totalHouses = 0;

    cohorts.forEach((cohort) => {
      const houses = Number(cohort.houses) || 0;
      totalHouses += houses;

      if (cohort.type === 'KW') {
        const kw = Number((cohort.loadDetails as { kw: number })?.kw) || 0;
        totalDailyKwh += kw * SOLAR_CONSTANTS.SOLAR_YIELD_KWH_PER_KW_DAY * houses;
      } else {
        const counts = (cohort.loadDetails as Record<string, number>) || {};
        let whPerHouse = 0;
        for (const [key, spec] of Object.entries(SOLAR_CONSTANTS.APPLIANCE_SPECS)) {
          whPerHouse += (counts[key] || 0) * spec.watts * spec.defaultHours;
        }
        totalDailyKwh += (whPerHouse / 1000) * houses;
      }
    });

    const baseRequiredKw = totalDailyKwh / SOLAR_CONSTANTS.SOLAR_YIELD_KWH_PER_KW_DAY;
    const totalRequiredKw = baseRequiredKw * SOLAR_CONSTANTS.GRID_LOSS_MULTIPLIER;
    const requiredLandAcres = totalRequiredKw * SOLAR_CONSTANTS.LAND_ACRES_PER_KW;
    const landFeasible = Number(availableLandAcres || 0) >= requiredLandAcres;

    const solarBudget = Math.round(totalRequiredKw * SOLAR_CONSTANTS.SYSTEM_COST_PER_KW);
    const transmissionCost = Math.round(Number(distanceToSubstation || 0) * 150000);
    const totalBudget = solarBudget + transmissionCost;

    return {
      totalHouses,
      totalDailyKwh,
      baseRequiredKw,
      totalRequiredKw,
      requiredLandAcres,
      landFeasible,
      solarBudget,
      transmissionCost,
      totalBudget
    };
  }, [cohorts, availableLandAcres, distanceToSubstation]);

  const handleAddCohort = () => {
    setCohorts((prev) => [
      ...prev,
      {
        type: 'APPLIANCE',
        houses: 25,
        loadDetails: { fan: 3, bulb: 5, tv: 1, fridge: 1, ac: 0 }
      }
    ]);
  };

  const handleUpdateCohort = (index: number, updated: CohortPayload) => {
    setCohorts((prev) => {
      const copy = [...prev];
      copy[index] = updated;
      return copy;
    });
  };

  const handleRemoveCohort = (index: number) => {
    setCohorts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGeneratePdf = async () => {
    if (!areaName.trim()) {
      setErrorMsg('Area / Feeder Name is required.');
      return;
    }
    if (cohorts.length === 0) {
      setErrorMsg('Please add at least one consumer cohort.');
      return;
    }

    const land = Number(availableLandAcres);
    if (isNaN(land) || land < 0) {
      setErrorMsg('Available Land must be a non-negative number.');
      return;
    }

    const dist = Number(distanceToSubstation);
    if (isNaN(dist) || dist < 0) {
      setErrorMsg('Distance to Substation must be a non-negative number.');
      return;
    }

    setIsGeneratingPdf(true);
    setErrorMsg(null);
    setSuccessToast(null);

    try {
      const token = await getIdToken();
      await generateAndDownloadDPR({
        areaName: areaName.trim(),
        availableLandAcres: land,
        distanceToSubstation: dist,
        cohortData: cohorts
      }, token);
      setSuccessToast(`Official DPR for "${areaName}" downloaded successfully!`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to generate DPR PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-700 hover:text-red-950 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Split-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane (Input Workspace): 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          {/* Top Inputs: Area Name, Available Land, Distance */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                1. Project Site & Feeder Geography
              </h2>
              <p className="text-xs text-slate-500">
                Specify target feeder boundaries, earmarked land parcels, and grid intertie distance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Area / Feeder Name
                </label>
                <input
                  type="text"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  placeholder="e.g. Ramgarh Feeder #3"
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Available Land (Acres)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={availableLandAcres}
                  onChange={(e) => setAvailableLandAcres(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 5.0"
                  className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Distance to Substation (km)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={distanceToSubstation}
                  onChange={(e) => setDistanceToSubstation(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 3.0"
                  className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Cohorts Workspace */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  2. Consumer Cohorts & Demand Mapping
                </h2>
                <p className="text-xs text-slate-500">
                  Add distinct demographic groups with customized appliance loads or direct kW sanctions.
                </p>
              </div>

              {/* Add Cohort Button */}
              <button
                type="button"
                onClick={handleAddCohort}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-900 bg-yellow-400 hover:bg-yellow-300 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Cohort</span>
              </button>
            </div>

            {/* Dynamic Cohort Rows */}
            <div className="space-y-3">
              {cohorts.map((cohort, idx) => (
                <CohortInputRow
                  key={idx}
                  index={idx}
                  cohort={cohort}
                  onChange={(updated) => handleUpdateCohort(idx, updated)}
                  onRemove={() => handleRemoveCohort(idx)}
                  canRemove={cohorts.length > 1}
                />
              ))}
            </div>

            {/* Quick Demo Presets */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 text-[11px] font-semibold">Demo Presets:</span>
              <button
                type="button"
                onClick={() => {
                  setAreaName('Surajpur High-Density Microgrid');
                  setAvailableLandAcres(4.0); // Will trigger land deficit alert! (Required ~4.7 acres)
                  setDistanceToSubstation(4.2);
                  setCohorts([
                    { type: 'KW', houses: 80, loadDetails: { kw: 3.5 } },
                    { type: 'APPLIANCE', houses: 50, loadDetails: { fan: 4, bulb: 8, tv: 1, fridge: 1, ac: 2 } }
                  ]);
                }}
                className="px-2.5 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-[11px] font-semibold cursor-pointer"
              >
                Trigger Land Deficit Alert
              </button>
              <button
                type="button"
                onClick={() => {
                  setAreaName('Greenfield Solar Feeder-01');
                  setAvailableLandAcres(8.5); // Ample land surplus
                  setDistanceToSubstation(2.0);
                  setCohorts([
                    { type: 'KW', houses: 50, loadDetails: { kw: 2.0 } },
                    { type: 'APPLIANCE', houses: 40, loadDetails: { fan: 3, bulb: 6, tv: 1, fridge: 1, ac: 1 } }
                  ]);
                }}
                className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-semibold cursor-pointer"
              >
                Feasible Greenfield Project
              </button>
            </div>
          </div>
        </div>

        {/* Right Pane (Live Sticky Summary): 5 cols */}
        <div className="lg:col-span-5">
          <DPRSummarySticky
            areaName={areaName}
            availableLandAcres={availableLandAcres}
            distanceToSubstation={distanceToSubstation}
            totalHouses={dprMath.totalHouses}
            totalDailyKwh={dprMath.totalDailyKwh}
            baseRequiredKw={dprMath.baseRequiredKw}
            totalRequiredKw={dprMath.totalRequiredKw}
            requiredLandAcres={dprMath.requiredLandAcres}
            landFeasible={dprMath.landFeasible}
            solarBudget={dprMath.solarBudget}
            transmissionCost={dprMath.transmissionCost}
            totalBudget={dprMath.totalBudget}
            isGeneratingPdf={isGeneratingPdf}
            onGeneratePdf={handleGeneratePdf}
          />
        </div>
      </div>
    </div>
  );
}
