'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun,
  Zap,
  ArrowRight,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingDown,
  KeyRound,
  Download,
  FileText,
  Loader2,
  User,
  History,
  X,
  Clock,
  MapPin
} from 'lucide-react';
import { Header } from '@/components/public/Header';
import { InputSelector } from '@/components/public/InputSelector';
import { ApplianceWizard } from '@/components/public/ApplianceWizard';
import { LiveOutputCards } from '@/components/public/LiveOutputCards';
import { ConnectInstallers } from '@/components/public/ConnectInstallers';
import { FeedbackRating } from '@/components/public/FeedbackRating';
import { AboutCreator } from '@/components/public/AboutCreator';
import {
  calculatePublicInquiry,
  createPublicInquiry,
  fetchMyInquiries,
  downloadPersonalDprPdf,
  PublicCalculateResponse,
  LeadItem
} from '@/lib/api';
import { formatINR, SOLAR_CONSTANTS, calculateClientSubsidy } from '@/lib/constants';
import { useAuth } from '@/context/AuthContext';
import { RequireAuth } from '@/components/ProtectedRoute';

function PublicB2CPortalContent() {
  const [mode, setMode] = useState<'BILL' | 'APPLIANCES'>('BILL');
  const [monthlyUnits, setMonthlyUnits] = useState<number>(360);
  const [applianceCounts, setApplianceCounts] = useState<Record<string, number>>({
    fan: 3,
    bulb: 6,
    tv: 1,
    fridge: 1,
    ac: 1
  });

  const [meterNumber, setMeterNumber] = useState<string>('NDMC-908124');
  const [consumerName, setConsumerName] = useState<string>('Suresh Kumar');
  const [consumerCity, setConsumerCity] = useState<string>('New Delhi');

  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<PublicCalculateResponse | null>(null);
  const router = useRouter();

  // PDF Download State
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [pdfDownloadError, setPdfDownloadError] = useState<string | null>(null);

  // Firebase Auth & Saved Reports State
  const { currentUser, userRole, mongoUser, signInWithGoogle, getIdToken, demoLogin } = useAuth();
  const [savedInquiries, setSavedInquiries] = useState<LeadItem[]>([]);
  const [showSavedModal, setShowSavedModal] = useState<boolean>(false);
  const [showAboutCreator, setShowAboutCreator] = useState<boolean>(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState<boolean>(false);
  const [unauthorizedToast, setUnauthorizedToast] = useState<string | null>(null);

  const handleDownloadPersonalPdf = async (inquiryId?: string) => {
    const targetId = inquiryId || result?.inquiryId || result?.meterNumber;
    if (!targetId) return;

    setIsDownloadingPdf(true);
    setPdfDownloadError(null);

    try {
      const token = await getIdToken();
      await downloadPersonalDprPdf(targetId, token);
    } catch (err: any) {
      console.error('PDF Download failed:', err);
      setPdfDownloadError(err.message || 'Failed to generate PDF report.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const msg = sessionStorage.getItem('sdpr_auth_toast');
      const urlParams = new URLSearchParams(window.location.search);
      if (msg || urlParams.get('auth_error') === 'unauthorized') {
        setUnauthorizedToast(msg || 'Not Authorized: State Gov Administrator credentials required.');
        sessionStorage.removeItem('sdpr_auth_toast');
        window.history.replaceState({}, '', '/');
        const timer = setTimeout(() => {
          setUnauthorizedToast(null);
        }, 6000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.displayName && (!consumerName || consumerName === 'Suresh Kumar')) {
        setConsumerName(currentUser.displayName);
      }
      loadSavedInquiries();
    } else {
      setSavedInquiries([]);
    }
  }, [currentUser]);

  React.useEffect(() => {
    if (mongoUser?.meterNumber) {
      setMeterNumber(mongoUser.meterNumber);
    }
  }, [mongoUser]);

  const loadSavedInquiries = async () => {
    setIsLoadingSaved(true);
    try {
      const token = await getIdToken();
      if (token) {
        const data = await fetchMyInquiries(token);
        setSavedInquiries(data);
      }
    } catch (e) {
      console.warn('Could not load saved inquiries:', e);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const handleApplianceCountChange = (appliance: string, count: number) => {
    setApplianceCounts((prev) => ({
      ...prev,
      [appliance]: count
    }));
  };

  const handleCalculate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsCalculating(true);
    setErrorMsg(null);

    try {
      const consumptionPayload =
        mode === 'BILL'
          ? { type: 'BILL' as const, value: Number(monthlyUnits) || 0 }
          : { type: 'APPLIANCES' as const, value: applianceCounts };

      const token = await getIdToken();
      const inheritedMeter = mongoUser?.meterNumber || meterNumber.trim() || undefined;

      // 1. Calculate sizing math via calculate endpoint or client fallback
      let calcResponse: PublicCalculateResponse;
      try {
        calcResponse = await calculatePublicInquiry(
          {
            meterNumber: inheritedMeter,
            consumptionData: consumptionPayload,
            consumerName: consumerName.trim() || currentUser?.displayName || mongoUser?.name || undefined,
            city: consumerCity.trim() || undefined
          },
          token
        );
      } catch (calcErr) {
        // Fallback sizing calculation if calculate endpoint has connection delays
        let dailyUnits = 0;
        if (mode === 'BILL') {
          dailyUnits = (Number(monthlyUnits) || 300) / 30;
        } else {
          let totalWatts = 0;
          Object.entries(applianceCounts).forEach(([key, count]) => {
            const spec = (SOLAR_CONSTANTS.APPLIANCE_SPECS as any)[key];
            if (spec && count > 0) {
              totalWatts += count * spec.watts * spec.defaultHours;
            }
          });
          dailyUnits = totalWatts / 1000;
        }
        const kw = Math.max(1, Math.round(((dailyUnits / 4) * 1.1) * 10) / 10);
        const gross = Math.round(kw * 60000);
        const sub = calculateClientSubsidy(kw);
        calcResponse = {
          inquiryId: `temp-${Date.now()}`,
          meterNumber: inheritedMeter || `DL-MTR-${Date.now().toString().slice(-6)}`,
          consumptionData: consumptionPayload,
          calculatedKw: kw,
          grossCost: gross,
          subsidyAmount: sub,
          netCost: Math.max(0, gross - sub),
          batteryBackupKwh: Math.round(dailyUnits * 0.5 * 10) / 10,
          status: 'Pending',
          feedbackRating: null,
          sizingDetails: {
            dailyKwh: dailyUnits,
            monthlySavingsEst: Math.round(dailyUnits * 30 * 8.5)
          }
        };
      }

      // 2. Persist directly to live database via POST /api/public/inquiry with citizen Authorization token
      const persistedInquiry = await createPublicInquiry(
        {
          calculatedKw: calcResponse.calculatedKw,
          grossCost: calcResponse.grossCost,
          calculatedCost: calcResponse.grossCost,
          subsidyAmount: calcResponse.subsidyAmount,
          netCost: calcResponse.netCost,
          batteryBackupKwh: calcResponse.batteryBackupKwh,
          meterNumber: calcResponse.meterNumber || inheritedMeter,
          userId: currentUser?.uid || mongoUser?.firebaseUid || undefined,
          consumerName: consumerName.trim() || currentUser?.displayName || mongoUser?.name || undefined,
          city: consumerCity.trim() || undefined,
          consumptionData: consumptionPayload
        },
        token
      );

      const finalResult: PublicCalculateResponse = {
        ...calcResponse,
        inquiryId: (persistedInquiry as any).inquiryId || (persistedInquiry as any)._id || calcResponse.inquiryId,
        status: (persistedInquiry as any).status || calcResponse.status
      };

      setResult(finalResult);
      await loadSavedInquiries();
    } catch (err: any) {
      console.error('Error in handleCalculate:', err);
      setErrorMsg(err.message || 'Error executing calculation.');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-lime-400 selection:text-slate-950 font-sans bg-eco-grid">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* Hero Section */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-500/10 border border-lime-500/30 text-lime-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PM Surya Ghar: Muft Bijli Yojana Active Scheme</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Design Your Rooftop Solar <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-300">
              Zero-Electricity Sizing
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Input your monthly consumption units or select household appliances. Our micro-sizing engine 
            runs real-time irradiation math and applies direct central government subsidies.
          </p>
        </section>

        {/* Prominent Google Auth Banner (B2C) */}
        {!currentUser ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-blue-950/40 border border-blue-500/20 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Sign in with Google to Save Your Report
                </h3>
                <p className="text-xs text-slate-400">
                  Save calculations to your citizen profile, link inquiries to installer quotes, and track state approval.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => signInWithGoogle()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white hover:bg-slate-100 text-slate-900 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] cursor-pointer"
              >
                <span>Sign in with Google</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/login"
                className="text-xs text-slate-400 hover:text-white hover:underline transition-colors px-2 py-1"
              >
                All Login Options →
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-3.5 px-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">
                Connected Citizen Profile:{' '}
                <strong className="text-white">{currentUser.displayName || currentUser.email}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSavedModal(true)}
              className="text-lime-400 hover:text-lime-300 font-semibold underline underline-offset-2 flex items-center gap-1 cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>View My Saved Calculations ({savedInquiries.length})</span>
            </button>
          </div>
        )}

        {/* Form Container */}
        <div className="p-6 sm:p-8 rounded-3xl glass-card-dark border-slate-800 shadow-2xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-lime-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Consumer Identification Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                GOV Meter / CA Number
              </label>
              {mongoUser?.meterNumber ? (
                <div className="w-full bg-emerald-950/40 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-emerald-300 flex items-center justify-between shadow-sm">
                  <span className="font-bold">{mongoUser.meterNumber}</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Linked Profile
                  </span>
                </div>
              ) : (
                <input
                  type="text"
                  value={meterNumber}
                  onChange={(e) => setMeterNumber(e.target.value)}
                  placeholder="e.g. NDMC-892104"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
                />
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Consumer Name (Optional)
              </label>
              <input
                type="text"
                value={consumerName}
                onChange={(e) => setConsumerName(e.target.value)}
                placeholder="e.g. Ramesh Verma"
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                City / Gov Circle
              </label>
              <input
                type="text"
                value={consumerCity}
                onChange={(e) => setConsumerCity(e.target.value)}
                placeholder="e.g. New Delhi"
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400"
              />
            </div>
          </div>

          {/* Component 1: Input Selector Toggle */}
          <div className="pt-2">
            <InputSelector mode={mode} onChangeMode={setMode} />
          </div>

          {/* Component 2: Mode Views */}
          <div className="min-h-[220px]">
            {mode === 'BILL' ? (
              <motion.div
                key="bill-mode"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 max-w-xl mx-auto py-4 text-center"
              >
                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                    Monthly Consumption
                  </span>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-5xl font-black font-mono text-lime-400 tracking-tight">
                      {monthlyUnits}
                    </span>
                    <span className="text-lg font-bold text-slate-300">kWh / Units</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Average Daily Run: {(monthlyUnits / 30).toFixed(1)} kWh/day
                  </p>
                </div>

                {/* Range Slider */}
                <div className="space-y-2 px-4">
                  <input
                    type="range"
                    min="60"
                    max="1500"
                    step="20"
                    value={monthlyUnits}
                    onChange={(e) => setMonthlyUnits(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-lime-400"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>60 Units (1 kW)</span>
                    <span>300 Units (2.5 kW)</span>
                    <span>600 Units (5 kW)</span>
                    <span>1500 Units</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <span className="text-xs text-slate-400 mr-1">Quick Presets:</span>
                  {[
                    { label: '1-2 BHK (180 u)', val: 180 },
                    { label: '3 BHK (360 u)', val: 360 },
                    { label: '4 BHK + AC (600 u)', val: 600 },
                    { label: 'Villa (900 u)', val: 900 }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setMonthlyUnits(preset.val)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                        monthlyUnits === preset.val
                          ? 'bg-lime-500/20 text-lime-300 border-lime-500/40 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="appliance-mode"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <ApplianceWizard
                  counts={applianceCounts}
                  onCountChange={handleApplianceCountChange}
                />
              </motion.div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => handleCalculate()}
              disabled={isCalculating}
              className="w-full sm:w-auto min-w-[280px] inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-400 hover:brightness-105 shadow-[0_0_25px_rgba(132,204,22,0.45)] transition-all cursor-pointer text-sm sm:text-base disabled:opacity-50"
            >
              <Zap className="w-5 h-5 fill-slate-950" />
              <span>{isCalculating ? 'Computing Microgrid Math...' : 'Calculate Solar Sizing & Subsidy'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Component 3: Live Output UI (Framer Motion Cards) */}
        <AnimatePresence>
          {result && (
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6 pt-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    <Sun className="w-6 h-6 text-lime-400" />
                    <span>Your Recommended Solar Configuration</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Sized to cover 100% of your energy demand with PM Surya Ghar subsidy applied.
                  </p>
                </div>
              </div>

              <LiveOutputCards data={result} />

              {/* Feature Extension: Connect with Installers Module */}
              <ConnectInstallers
                inquiryId={result.inquiryId}
                meterNumber={result.meterNumber}
                calculatedKw={result.calculatedKw}
                initialCity={consumerCity}
                onDownloadPdf={() => handleDownloadPersonalPdf(result.inquiryId)}
                isDownloadingPdf={isDownloadingPdf}
              />

              {/* Prominent Secondary Action: Download Detailed PDF Report */}
              <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-emerald-950/40 border border-emerald-500/30 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                <div className="space-y-1.5 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                    <FileText className="w-3.5 h-3.5" />
                    <span>MNRE Official Sizing Document</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Personal Rooftop Solar Installation Report (PDF)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Download an official, formatted report of your calculation featuring load audit mathematics, PM Surya Ghar subsidy eligibility, and financial budget breakdown.
                  </p>
                </div>

                <div className="w-full sm:w-auto shrink-0 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadPersonalPdf(result.inquiryId)}
                    disabled={isDownloadingPdf}
                    className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-400 hover:brightness-110 text-slate-950 transition-all shadow-[0_0_20px_rgba(132,204,22,0.35)] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isDownloadingPdf ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Generating Document...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-slate-950" />
                        <span>Download Detailed PDF Report</span>
                      </>
                    )}
                  </button>
                  {pdfDownloadError && (
                    <p className="text-[11px] text-red-400 font-medium text-center sm:text-right">
                      {pdfDownloadError}
                    </p>
                  )}
                </div>
              </div>

              {/* Component 4: Feedback Rating */}
              <FeedbackRating
                inquiryId={result.inquiryId}
                meterNumber={result.meterNumber}
                currentRating={result.feedbackRating}
              />
            </motion.section>
          )}
        </AnimatePresence>

        {/* Subsidy Benchmark Reference Banner */}
        <section className="p-6 rounded-2xl glass-card-dark border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <Info className="w-4 h-4 text-cyan-400" />
            <span>Government Central Subsidy Reference (PM Surya Ghar Slabs)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">1 kW System</span>
              <div className="text-base font-bold font-mono text-lime-400 mt-0.5">
                {formatINR(30000)} Flat
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Generates ~120 kWh / month</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">2 kW System</span>
              <div className="text-base font-bold font-mono text-lime-400 mt-0.5">
                {formatINR(60000)} Flat
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Generates ~240 kWh / month</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">3 kW and Above</span>
              <div className="text-base font-bold font-mono text-lime-400 mt-0.5">
                {formatINR(78000)} Max Cap
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Generates ~360+ kWh / month</p>
            </div>
          </div>
        </section>

        {/* Citizen Saved Calculations Modal */}
        <AnimatePresence>
          {showSavedModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSavedModal(false)}
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-xl p-6 sm:p-7 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-100 z-10 space-y-5 max-h-[85vh] flex flex-col"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-lime-400" />
                    <h3 className="text-base font-bold text-white tracking-tight">
                      My Saved Solar Calculations
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSavedModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-y-auto space-y-3 flex-1 pr-1">
                  {isLoadingSaved ? (
                    <div className="py-12 text-center text-xs text-slate-400 font-mono">
                      Loading your saved reports from State Demand Radar...
                    </div>
                  ) : savedInquiries.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 italic">
                      No saved calculations found under your citizen account. Calculate a system to automatically save it!
                    </div>
                  ) : (
                    savedInquiries.map((inq) => (
                      <div
                        key={inq._id}
                        className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {inq.meterNumber}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lime-500/10 text-lime-400 border border-lime-500/30">
                              {inq.calculatedKw.toFixed(1)} kW
                            </span>
                            <span className="text-[10px] uppercase font-mono text-slate-400">
                              {inq.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-3">
                            <span>Net Outlay: <strong className="text-slate-200">{formatINR(inq.netCost || inq.calculatedCost)}</strong></span>
                            <span>•</span>
                            <span>Subsidy: <strong className="text-emerald-400">{formatINR(inq.subsidyAmount || 0)}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDownloadPersonalPdf(inq._id)}
                            title="Download PDF Report"
                            disabled={isDownloadingPdf}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer border border-slate-800"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMeterNumber(inq.meterNumber);
                              if (inq.consumerName) setConsumerName(inq.consumerName);
                              if (inq.city) setConsumerCity(inq.city);
                              setShowSavedModal(false);
                              handleCalculate();
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-lime-400 hover:bg-lime-300 text-slate-950 transition-colors cursor-pointer"
                          >
                            Load
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-slate-800 pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSavedModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Not Authorized Toast Banner with Instant Admin Switch */}
      <AnimatePresence>
        {unauthorizedToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 right-5 z-50 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-red-500/50 text-slate-100 shadow-[0_0_35px_rgba(239,68,68,0.35)] backdrop-blur-xl max-w-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Access Restricted</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 font-mono">
                  B2G Admin Only
                </span>
              </div>
              <p className="text-xs text-red-200">{unauthorizedToast}</p>
              <p className="text-[11px] text-slate-400">
                You are currently signed in as a <span className="text-amber-400 font-bold">Public Citizen</span>. Click below to switch to the State Gov Admin account.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await demoLogin('ADMIN');
                    setUnauthorizedToast(null);
                    router.push('/admin');
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-lime-400 hover:brightness-105 shadow-[0_0_15px_rgba(251,191,36,0.4)] transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-950" />
                <span>Switch to Admin</span>
              </button>
              <button
                type="button"
                onClick={() => setUnauthorizedToast(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 px-4 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-5xl mx-auto w-full">
        <p className="text-center sm:text-left">
          Dual-Sided Solar Infrastructure &amp; DPR Planning Platform • Complies with MNRE Grid Sizing Standards
        </p>
        <button
          type="button"
          onClick={() => setShowAboutCreator(true)}
          className="text-xs font-semibold text-slate-400 hover:text-lime-400 border border-slate-800 hover:border-lime-400/40 px-3 py-1.5 rounded-lg bg-slate-900/80 transition-colors cursor-pointer shrink-0"
        >
          About Creator
        </button>
      </footer>

      {/* About Creator Modal */}
      <AnimatePresence>
        {showAboutCreator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              <AboutCreator onClose={() => setShowAboutCreator(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PublicB2CPortal() {
  return (
    <RequireAuth>
      <PublicB2CPortalContent />
    </RequireAuth>
  );
}
