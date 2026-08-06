import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, getRedirectResult, signOut } from 'firebase/auth';
import { resolveAccess, resolveAccessAsync, type ResolvedAccess } from '../config/access';
import { auth, googleProvider, isFirebaseConfigured } from '../config/firebase';

/* Identity resolution order:
 *  1. Cloudflare Access  — /cdn-cgi/access/get-identity (perimeter gate on prod)
 *  2. Firebase Auth      — real "Sign in with Google" (works on any domain)
 *  3. Manual email login — soft gate fallback when neither is configured
 *
 * The RBAC model (email → role → pages) is identical regardless of source. */

const MANUAL_EMAIL_KEY = 'police_dashboard_manual_email';
const CF_IDENTITY_URL = '/cdn-cgi/access/get-identity';
const CF_LOGOUT_URL = '/cdn-cgi/access/logout';

type Source = 'cloudflare' | 'firebase' | 'manual' | null;

interface AuthState {
  loading: boolean;
  email: string | null;
  access: ResolvedAccess;
  source: Source;
  firebaseEnabled: boolean;
  needsManualLogin: boolean; // no Cloudflare and no Firebase → offer email entry
  signInWithGoogle: () => Promise<void>;
  submitEmail: (email: string) => void;
  refreshAccess: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function isLocalDev(): boolean {
  try {
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.local');
  } catch {
    return false;
  }
}

async function fetchCloudflareEmail(): Promise<string | null> {
  try {
    const res = await fetch(CF_IDENTITY_URL, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return (data && (data.email || data.user_email)) || null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [source, setSource] = useState<Source>(null);
  const [access, setAccess] = useState<ResolvedAccess>(resolveAccess(null));

  const apply = useCallback(async (e: string | null, src: Source) => {
    setEmail(e);
    setSource(src);
    const a = await resolveAccessAsync(e); // reads Firestore (central) or localStorage
    setAccess(a);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;

    (async () => {
      // 0. Local dev bypass — skip real auth on localhost so the UI can be
      //    developed/previewed without a Google login. Never runs in production
      //    (guarded by isLocalDev()); opt out with VITE_DISABLE_DEV_LOGIN=1.
      if (isLocalDev() && (import.meta as any).env?.VITE_DISABLE_DEV_LOGIN !== '1') {
        const devEmail =
          (import.meta as any).env?.VITE_DEV_EMAIL ||
          localStorage.getItem(MANUAL_EMAIL_KEY) ||
          'tummarat@gmail.com';
        await apply(devEmail, 'manual');
        setLoading(false);
        return;
      }

      // 1. Cloudflare Access
      const cfEmail = await fetchCloudflareEmail();
      if (cancelled) return;
      if (cfEmail) {
        await apply(cfEmail, 'cloudflare');
        setLoading(false);
        return;
      }

      // 2. Firebase (real Google sign-in)
      if (isFirebaseConfigured && auth) {
        try {
          await getRedirectResult(auth); // completes any returning sign-in redirect
        } catch (e) {
          console.warn('Google redirect result error:', e);
        }
        if (cancelled) return;
        unsub = onAuthStateChanged(auth, async (user) => {
          if (cancelled) return;
          await apply(user?.email ?? null, user?.email ? 'firebase' : null);
          if (!cancelled) setLoading(false);
        });
        return;
      }

      // 3. Manual email fallback
      let manual: string | null = null;
      try {
        manual = localStorage.getItem(MANUAL_EMAIL_KEY);
      } catch {
        /* ignore */
      }
      if (manual) await apply(manual, 'manual');
      else if (isLocalDev()) await apply('tummarat@gmail.com', 'manual');
      else await apply(null, null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [apply]);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) return;
    try {
      // Popup works across domains (app on vercel.app, authDomain on
      // firebaseapp.com) where signInWithRedirect breaks on third-party storage.
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged updates state
    } catch (e) {
      console.warn('Google sign-in failed:', e);
    }
  }, []);

  const submitEmail = useCallback(
    (e: string) => {
      const clean = e.trim();
      if (!clean) return;
      try {
        localStorage.setItem(MANUAL_EMAIL_KEY, clean);
      } catch {
        /* ignore */
      }
      apply(clean, 'manual');
    },
    [apply],
  );

  const refreshAccess = useCallback(async () => {
    const a = await resolveAccessAsync(email);
    setAccess(a);
  }, [email]);

  const logout = useCallback(async () => {
    if (source === 'cloudflare') {
      window.location.href = CF_LOGOUT_URL;
      return;
    }
    if (source === 'firebase' && auth) {
      try {
        await signOut(auth);
      } catch {
        /* ignore */
      }
      apply(null, null);
      return;
    }
    try {
      localStorage.removeItem(MANUAL_EMAIL_KEY);
    } catch {
      /* ignore */
    }
    apply(null, null);
  }, [source, apply]);

  const needsManualLogin = source !== 'cloudflare' && !isFirebaseConfigured;

  return (
    <AuthContext.Provider
      value={{
        loading,
        email,
        access,
        source,
        firebaseEnabled: isFirebaseConfigured,
        needsManualLogin,
        signInWithGoogle,
        submitEmail,
        refreshAccess,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
