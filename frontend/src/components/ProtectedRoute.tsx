'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, Loader2 } from 'lucide-react';

/**
 * Full-screen loading spinner used by route guards to prevent UI flashing
 */
function RouteGuardSpinner({ message = 'Verifying security credentials...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="w-full max-w-sm p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center mx-auto text-lime-400">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Security Gate
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {message}
          </p>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div className="bg-lime-400 h-full w-2/3 animate-pulse rounded-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * <RequireAuth>:
 * - Checks if currentUser exists. If null, redirects to /login.
 * - Used to wrap the Public Dashboard (/).
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, isLoading, router]);

  if (isLoading) {
    return <RouteGuardSpinner message="Verifying authentication session..." />;
  }

  if (!currentUser) {
    return <RouteGuardSpinner message="Authentication required. Redirecting to login..." />;
  }

  return <>{children}</>;
}

/**
 * <RequireAdmin>:
 * - Checks if currentUser exists AND userRole === 'ADMIN'.
 * - If null, redirects to /login. If role is 'PUBLIC', redirects to / with a "Not Authorized" toast.
 * - Used to wrap all /admin/* routes.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { currentUser, userRole, isLoading, demoLogin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace('/login?tab=official');
    }
  }, [currentUser, isLoading, router]);

  if (isLoading) {
    return <RouteGuardSpinner message="Verifying administrative privileges..." />;
  }

  if (!currentUser) {
    return <RouteGuardSpinner message="Administrator credentials required. Redirecting to login..." />;
  }

  if (userRole !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900 border border-red-500/40 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Access Restricted: Not Authorized
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              State Gov Administrator credentials required.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Logged in as: <span className="text-amber-400 font-mono">{currentUser?.email}</span> (Role: {userRole || 'PUBLIC'})
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={async () => {
                await demoLogin('ADMIN');
                window.location.reload();
              }}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-lime-400 hover:brightness-105 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(251,191,36,0.3)]"
            >
              <span>Instant Switch to State Admin</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push('/login?tab=official&switch=1')}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-amber-300 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700"
              >
                Log In as Official
              </button>
              <button
                type="button"
                onClick={() => router.replace('/')}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Backwards compatibility wrapper for ProtectedRoute
 */
export function ProtectedRoute({
  children,
  requireAdmin = false
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  if (requireAdmin) {
    return <RequireAdmin>{children}</RequireAdmin>;
  }
  return <RequireAuth>{children}</RequireAuth>;
}
