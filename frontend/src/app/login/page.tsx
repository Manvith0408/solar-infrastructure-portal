'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, UserRole } from '@/context/AuthContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/Tabs';
import {
  Sun,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  Building,
  KeyRound,
  Zap,
  CheckCircle2,
  Sparkles,
  Users,
  Compass,
  FileText,
  User,
  Hash,
  UserPlus,
  LogIn
} from 'lucide-react';

function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.43 7.37 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.29 2.57 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}



function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'official' ? 'official' : 'homeowner';

  const {
    currentUser,
    userRole,
    isLoading,
    loading,
    signInWithGoogle,
    signInWithPublicEmailPassword,
    registerPublicUser,
    signInWithAdminPassword,
    registerAdminUser
  } = useAuth();

  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Homeowner Mode Toggle: false = Sign In (Default), true = Register
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);

  // Homeowner Sign In form state (no prefilled default credentials)
  const [homeownerEmail, setHomeownerEmail] = useState<string>('');
  const [homeownerPassword, setHomeownerPassword] = useState<string>('');

  // Homeowner Register form state
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regMeterNumber, setRegMeterNumber] = useState<string>('');

  // Official (Admin) Mode Toggle: false = Sign In (Default), true = Register
  const [isAdminRegisterMode, setIsAdminRegisterMode] = useState<boolean>(false);

  // Official (Admin) Sign In form state (no prefilled default credentials)
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');

  // Official (Admin) Register form state
  const [adminRegName, setAdminRegName] = useState<string>('');
  const [adminRegEmail, setAdminRegEmail] = useState<string>('');
  const [adminRegPassword, setAdminRegPassword] = useState<string>('');
  const [adminAuthCode, setAdminAuthCode] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);


  // 4. LOGIN PAGE AUTO-REDIRECT:
  // If user is already authenticated as ADMIN and not explicitly switching accounts, route to admin dashboard
  useEffect(() => {
    if (!loading && currentUser && userRole === 'ADMIN' && searchParams.get('switch') !== '1') {
      router.replace('/admin/dashboard');
    }
  }, [loading, currentUser, userRole, searchParams, router]);

  /**
   * RULE 1: STRICT LOGIN SUBMISSION FUNCTION
   * Calls Firebase signInWithEmailAndPassword (via auth context).
   * In the try block: ONLY executes routing operation after Firebase promise resolves successfully.
   * In the catch block: STOPS execution. Does not set user state. Does not redirect. Sets error state with red toast.
   */
  const handleLogin = async (email: string, pass: string, roleType: 'PUBLIC' | 'ADMIN' = 'PUBLIC') => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessToast(null);

    try {
      const result =
        roleType === 'ADMIN'
          ? await signInWithAdminPassword(email, pass)
          : await signInWithPublicEmailPassword(email, pass);

      // ONLY execute routing operation AFTER the Firebase promise resolves successfully
      setSuccessToast(
        roleType === 'ADMIN'
          ? 'Credentials verified. Entering State Gov Workspace...'
          : 'Authentication successful. Routing to Public Solar Calculator...'
      );

      setTimeout(() => {
        router.replace(result.redirectUrl || (roleType === 'ADMIN' ? '/admin' : '/'));
      }, 350);
    } catch (err: unknown) {
      // STOP: Do NOT set any user state. Do NOT redirect.
      console.error('[handleLogin] Authentication rejected by Firebase:', err);
      let msg = 'Invalid email or password. Please check your credentials.';

      if (err instanceof Error) {
        if (err.message.includes('Unauthorized') || err.message.includes('Administrator credentials required')) {
          msg = 'Unauthorized. Administrator credentials required.';
        } else if (
          err.message.includes('auth/invalid-credential') ||
          err.message.includes('auth/wrong-password') ||
          err.message.includes('auth/user-not-found') ||
          err.message.includes('invalid-credential') ||
          err.message.includes('wrong-password')
        ) {
          msg = 'Invalid email or password. Please check your credentials.';
        } else if (err.message.includes('auth/too-many-requests')) {
          msg = 'Too many failed login attempts. Please try again in a few moments.';
        } else if (err.message.includes('auth/invalid-email')) {
          msg = 'Please enter a valid email address.';
        } else {
          msg = err.message;
        }
      }

      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  // Tab 1: Homeowner (Public B2C) - Email & Password Sign In
  const handleHomeownerSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleLogin(homeownerEmail, homeownerPassword, 'PUBLIC');
  };

  /**
   * Tab 1: Homeowner (Public B2C) - Direct 1-Step Registration
   */
  const handleHomeownerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessToast(null);

    // Basic form validation
    if (!regName.trim() || !regEmail.trim() || !regPassword || !regMeterNumber.trim()) {
      setErrorMessage('Please fill in all registration fields (Name, Email, Password, Meter Number).');
      setIsSubmitting(false);
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      setIsSubmitting(false);
      return;
    }

    try {
      const { redirectUrl } = await registerPublicUser({
        name: regName,
        email: regEmail,
        pass: regPassword,
        meterNumber: regMeterNumber
      });

      setSuccessToast('Account created successfully! Entering Solar Calculator...');
      setTimeout(() => {
        router.replace(redirectUrl || '/');
      }, 400);
    } catch (err: unknown) {
      console.error('Homeowner registration error:', err);
      let msg = 'Registration failed. Please check your details.';
      if (err instanceof Error) {
        msg = err.message;
      }
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  // Tab 1: Homeowner (Public B2C) - Google OAuth Flow
  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessToast(null);

    try {
      const { role, redirectUrl } = await signInWithGoogle();
      setSuccessToast(
        `Welcome back! Routing to ${role === 'ADMIN' ? 'Admin Workspace' : 'Public Solar Calculator'}...`
      );

      setTimeout(() => {
        router.replace(redirectUrl || '/');
      }, 400);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Google authentication failed. Please try again.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  // Tab 2: Admin Login (B2G Official) - Email & Password Flow
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleLogin(adminEmail, adminPassword, 'ADMIN');
  };

  /**
   * Tab 2: Official (Admin) - Direct 1-Step Registration
   */
  const handleAdminRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessToast(null);

    // Form validation
    if (!adminRegName.trim() || !adminRegEmail.trim() || !adminRegPassword || !adminAuthCode.trim()) {
      setErrorMessage('Please fill in all registration fields (Name, Email, Password, Department Code).');
      setIsSubmitting(false);
      return;
    }

    if (adminRegPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      setIsSubmitting(false);
      return;
    }

    try {
      const { redirectUrl } = await registerAdminUser({
        name: adminRegName,
        email: adminRegEmail,
        pass: adminRegPassword,
        authCode: adminAuthCode
      });

      setSuccessToast('Admin account created! Entering State Gov Workspace...');
      setTimeout(() => {
        router.replace(redirectUrl || '/admin/dashboard');
      }, 400);
    } catch (err: unknown) {
      console.error('Admin registration error:', err);
      let msg = 'Registration failed. Please check your credentials.';
      if (err instanceof Error) {
        msg = err.message;
      }
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="w-full max-w-sm p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center mx-auto text-lime-400">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Verifying Session...
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Checking security credentials...
            </p>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-lime-400 h-full w-2/3 animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative flex flex-col justify-between overflow-x-hidden font-sans">
      {/* 1. DUAL-NATURE SPLIT/GRADIENT BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Left half: Dark Eco-Slate for Public B2C */}
        <div className="absolute top-0 left-0 w-full lg:w-1/2 h-full bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/20" />
        {/* Right half: High-contrast Slate/Admin Gray for B2G */}
        <div className="hidden lg:block absolute top-0 right-0 w-1/2 h-full bg-gradient-to-bl from-slate-950 via-slate-900 to-amber-950/20 border-l border-slate-800/40" />

        {/* Ambient atmospheric glows */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-lime-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Top Header / Platform Identity */}
      <header className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 z-10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-lime-400 via-amber-400 to-emerald-400 p-0.5 shadow-lg group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sun className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">
                SOLAR<span className="text-lime-400">PULSE</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700">
                Gov
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Dual-Sided Infrastructure & DPR Engine</p>
          </div>
        </Link>

        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700"
        >
          <Compass className="w-3.5 h-3.5 text-lime-400" />
          <span>Explore Calculator</span>
        </Link>
      </header>

      {/* Main Centered Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 z-10">
        <div className="w-full max-w-md">
          {/* Glassmorphism Card */}
          <div className="rounded-3xl bg-slate-900/85 backdrop-blur-2xl border border-slate-800/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] p-6 sm:p-8 space-y-5 relative overflow-hidden">
            {/* Top decorative neon border subtle line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-lime-400 via-amber-400 to-emerald-400 opacity-80" />

            {/* Card Header: Platform Logo and Title */}
            <div className="text-center space-y-1.5 pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-800/70 border border-slate-700/60 text-slate-300 text-[11px] font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Single Sign-On Architecture</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Solar Infrastructure Portal
              </h1>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Unified access gateway for homeowners and state GOV planning officials.
              </p>
            </div>

            {/* Error Notification Toast */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3.5 rounded-xl bg-red-950/70 border border-red-500/60 text-red-300 text-xs flex items-center gap-2.5 shadow-lg"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="font-medium leading-snug">{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Toast */}
            <AnimatePresence>
              {successToast && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">{successToast}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active Session Status Bar (if already signed in) */}
            {currentUser && (
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs shadow-md">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-slate-300">
                    Active Session: <strong className="text-white">{currentUser.email || currentUser.displayName}</strong>{' '}
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-lime-500/20 text-lime-400 uppercase font-bold ml-1">
                      {userRole || 'PUBLIC'}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Link
                    href={userRole === 'ADMIN' ? '/admin' : '/'}
                    className="px-3 py-1.5 rounded-xl bg-lime-400 text-slate-950 hover:bg-lime-300 font-bold transition-all text-center flex-1 sm:flex-none text-xs"
                  >
                    Open Dashboard →
                  </Link>
                </div>
              </div>
            )}

            {/* Tabbed Interface: Homeowner (Public) vs Official (Admin) */}
            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                setActiveTab(val);
                setErrorMessage(null);
                setSuccessToast(null);
              }}
            >
              <TabsList className="grid grid-cols-2 w-full p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
                <TabsTrigger
                  value="homeowner"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-lime-400/20 data-[state=active]:to-emerald-400/20 data-[state=active]:text-lime-300 data-[state=active]:border data-[state=active]:border-lime-500/40"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Homeowner</span>
                </TabsTrigger>
                <TabsTrigger
                  value="official"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-400/20 data-[state=active]:to-yellow-400/20 data-[state=active]:text-amber-300 data-[state=active]:border data-[state=active]:border-amber-500/40"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Official</span>
                </TabsTrigger>
              </TabsList>

              {/* ========================================================= */}
              {/* TAB 1: PUBLIC (B2C HOMEOWNER) - SIGN IN OR REGISTER       */}
              {/* ========================================================= */}
              <TabsContent value="homeowner" className="space-y-4 pt-1">
                {/* Eco-Modern Banner */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-lime-950/10 border border-emerald-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-lime-400">
                        {isRegisterMode
                          ? 'New Homeowner Registration'
                          : 'Citizen Solar Portal'}
                      </h3>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {isRegisterMode ? 'New Registration' : 'Secure Login'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isRegisterMode
                      ? 'Register your property with your GOV Meter to lock your government solar subsidy.'
                      : 'Sign in to calculate your solar savings and contact vendors.'}
                  </p>
                </div>

                {/* VIEW A: REGISTER VIEW */}
                {isRegisterMode ? (
                  <form onSubmit={handleHomeownerRegister} autoComplete="off" className="space-y-3.5">
                    {/* Field 1: Full Name */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          required
                          placeholder="Enter your full name"
                          autoComplete="off"
                          className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all"
                        />
                      </div>
                    </div>

                    {/* Field 2: Email Address */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          required
                          placeholder="Enter your email address"
                          autoComplete="off"
                          spellCheck={false}
                          className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* Field 3: Password */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Password
                        </label>
                        <span className="text-[10px] text-slate-500">Min 6 characters</span>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          required
                          placeholder="••••••••••••"
                          autoComplete="new-password"
                          className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* Field 4: GOV Meter Number (Mandatory & Unique) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-lime-400 flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          <span>GOV Meter Number / Consumer ID</span>
                        </label>
                        <span className="text-[10px] font-bold text-amber-400 uppercase">Unique ID</span>
                      </div>
                      <div className="relative">
                        <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-lime-500" />
                        <input
                          type="text"
                          value={regMeterNumber}
                          onChange={(e) => setRegMeterNumber(e.target.value)}
                          required
                          placeholder="Enter GOV Meter Number"
                          autoComplete="off"
                          className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-lime-500/40 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all font-mono uppercase"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Required to verify your property and prevent duplicate subsidy claims.
                      </p>
                    </div>

                    {/* Action: Create Account */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-400 hover:brightness-105 transition-all shadow-[0_0_20px_rgba(132,204,22,0.4)] cursor-pointer disabled:opacity-50 mt-1"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      ) : (
                        <UserPlus className="w-4 h-4 text-slate-950" />
                      )}
                      <span>{isSubmitting ? 'Creating Account...' : 'Create Account'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                    </button>
                  </form>
                ) : (
                  /* VIEW B: SIGN IN VIEW (DEFAULT) */
                  <div className="space-y-4">
                    <form onSubmit={handleHomeownerSignIn} autoComplete="off" className="space-y-3">
                      {/* Email Address */}
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            type="email"
                            value={homeownerEmail}
                            onChange={(e) => setHomeownerEmail(e.target.value)}
                            required
                            placeholder="Enter your email address"
                            autoComplete="off"
                            spellCheck={false}
                            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all font-mono"
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Password
                          </label>
                          <span className="text-[10px] text-slate-500">Min 6 characters</span>
                        </div>
                        <div className="relative">
                          <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            type="password"
                            value={homeownerPassword}
                            onChange={(e) => setHomeownerPassword(e.target.value)}
                            required
                            placeholder="••••••••••••"
                            autoComplete="current-password"
                            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-all font-mono"
                          />
                        </div>
                      </div>

                      {/* Primary Sign In Button */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-lime-400 to-emerald-400 hover:brightness-105 transition-all shadow-[0_0_15px_rgba(132,204,22,0.3)] cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        ) : (
                          <LogIn className="w-4 h-4 text-slate-950" />
                        )}
                        <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                      </button>
                    </form>

                    {/* Divider */}
                    <div className="relative flex items-center justify-center">
                      <div className="border-t border-slate-800 w-full" />
                      <span className="bg-slate-900 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider relative">
                        Or continue with
                      </span>
                    </div>

                    {/* Google OAuth Alternative */}
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-slate-950 hover:bg-slate-900 text-white border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group disabled:opacity-50"
                    >
                      <GoogleIcon className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" />
                      <span>Sign in with Google</span>
                    </button>
                  </div>
                )}

                {/* State Toggle: Register vs Sign In */}
                <div className="text-center pt-2 border-t border-slate-800/80">
                  {isRegisterMode ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(false);
                        setErrorMessage(null);
                        setSuccessToast(null);
                      }}
                      className="text-xs text-slate-400 hover:text-white font-medium hover:underline cursor-pointer"
                    >
                      Already have an account? <strong className="text-lime-400">Sign in</strong>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(true);
                        setErrorMessage(null);
                        setSuccessToast(null);
                      }}
                      className="text-xs text-slate-400 hover:text-white font-medium hover:underline cursor-pointer"
                    >
                      Don&apos;t have an account? <strong className="text-lime-400">Register here</strong>
                    </button>
                  )}
                </div>
              </TabsContent>

              {/* ========================================================= */}
              {/* TAB 2: ADMIN LOGIN (B2G OFFICIAL)                         */}
              {/* ========================================================= */}
              <TabsContent value="official" className="space-y-4 pt-1">
                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20 flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    {isAdminRegisterMode
                      ? 'Secure GOV Official Onboarding with Department Authorization Code.'
                      : 'Restricted to accredited Official Engineers and Area Planners.'}
                  </p>
                </div>

                {isAdminRegisterMode ? (
                  /* OFFICIAL REGISTER VIEW */
                  <form onSubmit={handleAdminRegister} autoComplete="off" className="space-y-3.5">
                    {/* Field 1: Full Name */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={adminRegName}
                          onChange={(e) => setAdminRegName(e.target.value)}
                          required
                          placeholder="Enter your full name"
                          autoComplete="off"
                          className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                        />
                      </div>
                    </div>

                    {/* Field 2: Official Email Address */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Official Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="email"
                          value={adminRegEmail}
                          onChange={(e) => setAdminRegEmail(e.target.value)}
                          required
                          placeholder="Enter official email address"
                          autoComplete="off"
                          spellCheck={false}
                          className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* Field 3: Password */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Password
                        </label>
                        <span className="text-[10px] text-slate-500">Min 6 characters</span>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="password"
                          value={adminRegPassword}
                          onChange={(e) => setAdminRegPassword(e.target.value)}
                          required
                          placeholder="••••••••••••"
                          autoComplete="new-password"
                          className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* Field 4: Department Authorization Code (Required) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Department Authorization Code</span>
                        </label>
                        <span className="text-[10px] font-bold text-amber-400 uppercase">Verification Code</span>
                      </div>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500" />
                        <input
                          type="text"
                          value={adminAuthCode}
                          onChange={(e) => setAdminAuthCode(e.target.value)}
                          required
                          placeholder="Enter authorization code"
                          autoComplete="off"
                          className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-amber-500/40 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-mono"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Required to verify GOV/State credentials.
                      </p>
                    </div>

                    {/* Action Button: Register Admin Account */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-105 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer disabled:opacity-50 mt-1"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      ) : (
                        <UserPlus className="w-4 h-4 text-slate-950" />
                      )}
                      <span>{isSubmitting ? 'Registering...' : 'Register Admin Account'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                    </button>
                  </form>
                ) : (
                  /* OFFICIAL SIGN IN VIEW (DEFAULT) */
                  <form onSubmit={handleAdminLogin} autoComplete="off" className="space-y-3.5">
                    {/* Field 1: Email Address */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="email"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          required
                          placeholder="Enter official email address"
                          autoComplete="off"
                          spellCheck={false}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* Field 2: Password */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Password
                        </label>
                        <span className="text-[10px] text-slate-500">Min 6 characters</span>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="password"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          required
                          placeholder="••••••••••••"
                          autoComplete="current-password"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* Action: Log In to Dashboard Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:brightness-105 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer disabled:opacity-50 mt-1"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      ) : (
                        <KeyRound className="w-4 h-4 text-slate-950" />
                      )}
                      <span>{isSubmitting ? 'Authenticating with Firebase...' : 'Log In to Dashboard'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                    </button>
                  </form>
                )}

                {/* State Toggle: Register vs Sign In */}
                <div className="text-center pt-2 border-t border-slate-800/80">
                  {isAdminRegisterMode ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminRegisterMode(false);
                        setErrorMessage(null);
                        setSuccessToast(null);
                      }}
                      className="text-xs text-slate-400 hover:text-white font-medium hover:underline cursor-pointer"
                    >
                      Already have access? <strong className="text-amber-400">Sign in</strong>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminRegisterMode(true);
                        setErrorMessage(null);
                        setSuccessToast(null);
                      }}
                      className="text-xs text-slate-400 hover:text-white font-medium hover:underline cursor-pointer"
                    >
                      New Official? <strong className="text-amber-400">Register here</strong>
                    </button>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Card Footer Info */}
            <div className="pt-2 text-center text-[11px] text-slate-500 border-t border-slate-800/60">
              <p>Protected by Firebase Authentication & Role-Based Access Control</p>
            </div>
          </div>
        </div>
      </main>

      {/* Global Footer */}
      <footer className="max-w-6xl w-full mx-auto px-4 py-4 z-10 text-center text-[11px] text-slate-500">
        <p>
          State Gov Solar Infrastructure & Feeder Planning Engine • Ministry of New & Renewable Energy Compliant
        </p>
      </footer>
    </div>
  );
}

export default function UnifiedLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
          Loading Unified Portal...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
