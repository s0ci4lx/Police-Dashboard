import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { resolveAccess, type ResolvedAccess } from '../config/access';

/* Identity resolution order:
 *  1. Cloudflare Access  — /cdn-cgi/access/get-identity (the real gate, on prod)
 *  2. Manual email login — a soft in-app gate used when Cloudflare is absent
 *     (local dev, or a Vercel *.vercel.app preview that can't use Cloudflare).
 *     On localhost it defaults to a bootstrap admin for convenience; elsewhere
 *     the user must type an authorized email on the no-access screen.
 *
 * NOTE: manual login is NOT real security (a known email can be typed). It exists
 * so the app is usable/previewable before Cloudflare Access is configured. */

const MANUAL_EMAIL_KEY = 'police_dashboard_manual_email';
const CF_IDENTITY_URL = '/cdn-cgi/access/get-identity';
const CF_LOGOUT_URL = '/cdn-cgi/access/logout';

type Source = 'cloudflare' | 'manual' | null;

interface AuthState {
  loading: boolean;
  email: string | null;
  access: ResolvedAccess;
  source: Source;
  needsManualLogin: boolean; // Cloudflare absent → app should offer email entry
  refreshAccess: () => void;
  submitEmail: (email: string) => void;
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

  const apply = useCallback((e: string | null, src: Source) => {
    setEmail(e);
    setSource(src);
    setAccess(resolveAccess(e));
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    const cfEmail = await fetchCloudflareEmail();
    if (cfEmail) {
      apply(cfEmail, 'cloudflare');
      setLoading(false);
      return;
    }

    // No Cloudflare identity → manual mode
    let manual: string | null = null;
    try {
      manual = localStorage.getItem(MANUAL_EMAIL_KEY);
    } catch {
      /* ignore */
    }
    if (manual) {
      apply(manual, 'manual');
    } else if (isLocalDev()) {
      apply('tummarat@gmail.com', 'manual'); // dev convenience
    } else {
      apply(null, null); // production preview → require manual email entry
    }
    setLoading(false);
  }, [apply]);

  useEffect(() => {
    init();
  }, [init]);

  const refreshAccess = useCallback(() => setAccess(resolveAccess(email)), [email]);

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

  const logout = useCallback(() => {
    if (source === 'cloudflare') {
      window.location.href = CF_LOGOUT_URL;
      return;
    }
    try {
      localStorage.removeItem(MANUAL_EMAIL_KEY);
    } catch {
      /* ignore */
    }
    apply(null, null);
  }, [source, apply]);

  const needsManualLogin = source !== 'cloudflare';

  return (
    <AuthContext.Provider value={{ loading, email, access, source, needsManualLogin, refreshAccess, submitEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
