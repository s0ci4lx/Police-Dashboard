import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { resolveAccess, type ResolvedAccess } from '../config/access';

/* Identity comes from Cloudflare Access, which sits in front of the site and
 * exposes the signed-in user at /cdn-cgi/access/get-identity. In local dev there
 * is no Cloudflare, so we fall back to a "dev email" (defaults to a bootstrap
 * admin) that can be switched from the UI for testing different roles. */

const DEV_EMAIL_KEY = 'police_dashboard_dev_email';
const CF_IDENTITY_URL = '/cdn-cgi/access/get-identity';
const CF_LOGOUT_URL = '/cdn-cgi/access/logout';

interface AuthState {
  loading: boolean;
  email: string | null;
  access: ResolvedAccess;
  isDev: boolean; // true when identity came from the local dev fallback
  refreshAccess: () => void;
  setDevEmail: (email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

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
  const [isDev, setIsDev] = useState(false);
  const [access, setAccess] = useState<ResolvedAccess>(resolveAccess(null));

  const applyEmail = useCallback((e: string | null, dev: boolean) => {
    setEmail(e);
    setIsDev(dev);
    setAccess(resolveAccess(e));
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    const cfEmail = await fetchCloudflareEmail();
    if (cfEmail) {
      applyEmail(cfEmail, false);
    } else {
      // Dev / no-Cloudflare fallback
      let dev: string | null = null;
      try {
        dev = localStorage.getItem(DEV_EMAIL_KEY);
      } catch {
        /* ignore */
      }
      // Default dev identity to a bootstrap admin so local setup works out of the box
      applyEmail(dev || 'tummarat@gmail.com', true);
    }
    setLoading(false);
  }, [applyEmail]);

  useEffect(() => {
    init();
  }, [init]);

  const refreshAccess = useCallback(() => {
    setAccess(resolveAccess(email));
  }, [email]);

  const setDevEmail = useCallback(
    (e: string) => {
      try {
        localStorage.setItem(DEV_EMAIL_KEY, e);
      } catch {
        /* ignore */
      }
      applyEmail(e, true);
    },
    [applyEmail],
  );

  const logout = useCallback(() => {
    if (isDev) {
      try {
        localStorage.removeItem(DEV_EMAIL_KEY);
      } catch {
        /* ignore */
      }
      applyEmail(null, true);
    } else {
      window.location.href = CF_LOGOUT_URL;
    }
  }, [isDev, applyEmail]);

  return (
    <AuthContext.Provider value={{ loading, email, access, isDev, refreshAccess, setDevEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
