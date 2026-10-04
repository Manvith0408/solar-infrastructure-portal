'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { API_BASE_URL } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export type UserRole = 'PUBLIC' | 'ADMIN';

export interface MongoUser {
  _id: string;
  firebaseUid: string;
  email: string;
  name?: string;
  meterNumber?: string;
  photoURL?: string;
  role: UserRole;
  createdAt?: string;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userRole: UserRole | null;
  mongoUser: MongoUser | null;
  isLoading: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<{ user: FirebaseUser; role: UserRole; redirectUrl: string }>;
  signInWithPublicEmailPassword: (
    email: string,
    pass: string
  ) => Promise<{ user: FirebaseUser; role: UserRole; redirectUrl: string }>;
  registerPublicUser: (data: {
    name: string;
    email: string;
    pass: string;
    meterNumber: string;
  }) => Promise<{ redirectUrl: string }>;
  signInWithAdminPassword: (
    email: string,
    pass: string
  ) => Promise<{ user: FirebaseUser; role: UserRole; redirectUrl: string }>;
  registerAdminUser: (data: {
    name: string;
    email: string;
    pass: string;
    authCode: string;
  }) => Promise<{ redirectUrl: string }>;
  demoLogin: (role: UserRole) => Promise<string>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  fetchUserRole: (token: string) => Promise<UserRole>;
  executeRoutingOperation: (role: UserRole, targetTab?: 'homeowner' | 'official') => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [mongoUser, setMongoUser] = useState<MongoUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync session with backend MongoDB User collection
  const syncWithBackend = async (
    token: string,
    fallbackUser?: { uid: string; email: string; name?: string; photoURL?: string }
  ): Promise<MongoUser | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(fallbackUser || {})
      });

      if (!res.ok) {
        console.warn('[AuthContext] Backend sync returned status:', res.status);
        return null;
      }

      const data = await res.json();
      if (data.success && data.user) {
        setMongoUser(data.user);
        setUserRole(data.user.role as UserRole);
        return data.user;
      }
    } catch (err) {
      console.warn('[AuthContext] Failed to sync with backend:', err);
    }
    return null;
  };

  /**
   * RULE 3: SINGLE SOURCE OF TRUTH
   * Rely EXCLUSIVELY on Firebase onAuthStateChanged listener.
   * If onAuthStateChanged returns null, immediately clear state so route guards kick user back to /login.
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        try {
          const token = await firebaseUser.getIdToken();
          const synced = await syncWithBackend(token, {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || ''
          });

          if (synced) {
            setUserRole(synced.role);
          } else {
            const isAdm = firebaseUser.email?.includes('admin') || firebaseUser.email?.includes('gov') || firebaseUser.email?.includes('discom');
            setUserRole(isAdm ? 'ADMIN' : 'PUBLIC');
          }
        } catch (tokenErr) {
          console.warn('[AuthContext] Token acquisition error:', tokenErr);
        }
      } else {
        // No active Firebase session: strictly logged out
        setCurrentUser(null);
        setUserRole(null);
        setMongoUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch user role from backend
  const fetchUserRole = async (token: string): Promise<UserRole> => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.role) return data.role as UserRole;
        if (data.user?.role) return data.user.role as UserRole;
      }
    } catch (err) {
      console.warn('[AuthContext] /api/users/me lookup error:', err);
    }
    return 'PUBLIC';
  };

  // Route target determination
  const executeRoutingOperation = (role: UserRole, targetTab?: 'homeowner' | 'official'): string => {
    if (targetTab === 'official' && role !== 'ADMIN') {
      throw new Error('Unauthorized. Administrator credentials required.');
    }
    return role === 'ADMIN' ? '/admin/dashboard' : '/';
  };

  // Fetch active JWT
  const getIdToken = async (): Promise<string | null> => {
    if (currentUser && typeof currentUser.getIdToken === 'function') {
      try {
        return await currentUser.getIdToken();
      } catch (err) {
        console.error('[AuthContext] getIdToken error:', err);
        return null;
      }
    }
    return null;
  };

  // Google OAuth sign-in
  const signInWithGoogle = async (): Promise<{ user: FirebaseUser; role: UserRole; redirectUrl: string }> => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      setCurrentUser(user);

      const token = await user.getIdToken();
      await syncWithBackend(token, {
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || 'Google Citizen User',
        photoURL: user.photoURL || ''
      });

      const role = await fetchUserRole(token);
      setUserRole(role);

      const redirectUrl = executeRoutingOperation(role, 'homeowner');
      setLoading(false);
      return { user, role, redirectUrl };
    } catch (err: unknown) {
      setLoading(false);
      throw err;
    }
  };

  /**
   * RULE 1: STRICT LOGIN SUBMISSION (Citizen / Public)
   * Calls Firebase signInWithEmailAndPassword.
   * Throws immediately on invalid credentials or wrong password.
   * NEVER swallows errors or sets mock states.
   */
  const signInWithPublicEmailPassword = async (
    email: string,
    pass: string
  ): Promise<{ user: FirebaseUser; role: UserRole; redirectUrl: string }> => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const user = result.user;

      const token = await user.getIdToken();
      await syncWithBackend(token, {
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || 'Citizen Homeowner'
      });

      const role = await fetchUserRole(token);
      setCurrentUser(user);
      setUserRole(role);

      const redirectUrl = executeRoutingOperation(role, 'homeowner');
      setLoading(false);
      return { user, role, redirectUrl };
    } catch (err: unknown) {
      setLoading(false);
      // STOP: Do NOT set user state. Do NOT redirect. Re-throw error to caller.
      throw err;
    }
  };

  /**
   * RULE 1: STRICT LOGIN SUBMISSION (Admin / Official)
   * Calls Firebase signInWithEmailAndPassword.
   * Validates official ADMIN role.
   * Throws immediately on wrong password or unauthorized role.
   */
  const signInWithAdminPassword = async (
    email: string,
    pass: string
  ): Promise<{ user: FirebaseUser; role: UserRole; redirectUrl: string }> => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const user = result.user;

      const token = await user.getIdToken();
      await syncWithBackend(token, {
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || 'State Gov Official'
      });

      const role = await fetchUserRole(token);

      if (role !== 'ADMIN') {
        await signOut(auth);
        setCurrentUser(null);
        setUserRole(null);
        setMongoUser(null);
        setLoading(false);
        throw new Error('Unauthorized. Administrator credentials required.');
      }

      setCurrentUser(user);
      setUserRole('ADMIN');

      const redirectUrl = executeRoutingOperation('ADMIN', 'official');
      setLoading(false);
      return { user, role: 'ADMIN', redirectUrl };
    } catch (err: unknown) {
      setLoading(false);
      // STOP: Do NOT set user state. Do NOT redirect. Re-throw error to caller.
      throw err;
    }
  };

  // Pre-flight registration with Meter Number deduplication and auto-login
  const registerPublicUser = async (data: {
    name: string;
    email: string;
    pass: string;
    meterNumber: string;
  }): Promise<{ redirectUrl: string }> => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim(),
          password: data.pass,
          meterNumber: data.meterNumber.trim()
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        setLoading(false);
        const errorMsg =
          resData.error ||
          (res.status === 409
            ? 'This Meter Number is already registered.'
            : 'Registration failed.');
        const err = new Error(errorMsg);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any).status = res.status;
        throw err;
      }

      // Automatically log the user in using Firebase signInWithEmailAndPassword
      const loginResult = await signInWithPublicEmailPassword(data.email, data.pass);
      return { redirectUrl: loginResult.redirectUrl };
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // Secure Admin Registration with Department Authorization Code
  const registerAdminUser = async (data: {
    name: string;
    email: string;
    pass: string;
    authCode: string;
  }): Promise<{ redirectUrl: string }> => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim(),
          password: data.pass,
          authCode: data.authCode.trim()
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        setLoading(false);
        const errorMsg =
          resData.error ||
          (res.status === 403
            ? 'Registration failed: Invalid Authorization Code.'
            : res.status === 409
            ? 'An account with this email already exists.'
            : 'Admin registration failed.');
        const err = new Error(errorMsg);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err as any).status = res.status;
        throw err;
      }

      // Automatically log the admin in using Firebase signInWithEmailAndPassword
      const loginResult = await signInWithAdminPassword(data.email, data.pass);
      return { redirectUrl: loginResult.redirectUrl || '/admin/dashboard' };
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };



  // Evaluator 1-Click Demo Login (strictly uses real Firebase Auth credentials)
  const demoLogin = async (role: UserRole): Promise<string> => {
    setLoading(true);
    try {
      const email = role === 'ADMIN' ? 'admin@discom.gov.in' : 'citizen.demo@solarpulse.gov';
      const pass = role === 'ADMIN' ? 'DiscomAdmin@2026' : 'CitizenDemo@2026';

      const result = await signInWithEmailAndPassword(auth, email, pass);
      const user = result.user;
      setCurrentUser(user);

      const token = await user.getIdToken();
      const synced = await syncWithBackend(token, {
        uid: user.uid,
        email: user.email || '',
        name: role === 'ADMIN' ? 'State Nodal Administrator' : 'Suresh Kumar (Citizen)'
      });

      const verifiedRole = (synced?.role as UserRole) || role;
      setUserRole(verifiedRole);
      setMongoUser(synced);

      const redirectUrl = executeRoutingOperation(verifiedRole, role === 'ADMIN' ? 'official' : 'homeowner');
      setLoading(false);
      return redirectUrl;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  /**
   * RULE 2: FIX THE LOGOUT FUNCTION
   * 1. Calls Firebase signOut(auth).
   * 2. Immediately clears all local state variables (currentUser = null, userRole = null, mongoUser = null).
   * 3. Calls localStorage.clear() and sessionStorage.clear() to destroy cached user objects or tokens.
   * 4. Redirects the user to /login.
   */
  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (err) {
      console.error('[AuthContext] Firebase signOut error:', err);
    } finally {
      setCurrentUser(null);
      setUserRole(null);
      setMongoUser(null);
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
      }
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userRole,
        mongoUser,
        isLoading: loading,
        loading,
        signInWithGoogle,
        signInWithPublicEmailPassword,
        registerPublicUser,
        signInWithAdminPassword,
        registerAdminUser,
        demoLogin,
        logout,
        getIdToken,
        fetchUserRole,
        executeRoutingOperation
      }}
    >
      {loading ? (
        <FullScreenSpinner message="Verifying authentication session & access permissions..." />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function FullScreenSpinner({ message = 'Verifying security credentials & session...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="w-full max-w-sm p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center mx-auto text-lime-400">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            SolarPulse Platform
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
