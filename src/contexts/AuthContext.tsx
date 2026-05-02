import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export interface User {
  uid:          string;
  email:        string | null;
  displayName?: string | null;
  role?:        string;
  sessionToken?: string; // access token JWT (15 min)
}

interface AuthContextType {
  user:               User | null;
  loading:            boolean;
  login:              (user: User) => void;
  logout:             () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user:               null,
  loading:            true,
  login:              () => {},
  logout:             async () => {},
  refreshAccessToken: async () => null,
});

export const useAuth = () => useContext(AuthContext);

const STORAGE_KEY  = 'hdreams_user';
// Renovar el access token 2 min antes de que expire (15 min - 2 min = 13 min)
const REFRESH_INTERVAL_MS = 13 * 60 * 1000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer          = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearRefreshTimer = () => {
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    refreshTimer.current = null;
  };

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!res.ok) return null;
      const { sessionToken } = await res.json();
      setUser(prev => {
        if (!prev) return prev;
        const updated = { ...prev, sessionToken };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      return sessionToken as string;
    } catch {
      return null;
    }
  }, []);

  const startRefreshTimer = useCallback((u: User) => {
    clearRefreshTimer();
    if (!u.sessionToken) return;
    refreshTimer.current = setInterval(async () => {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        // Refresh falló — sesión expirada, limpiar
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
        clearRefreshTimer();
      }
    }, REFRESH_INTERVAL_MS);
  }, [refreshAccessToken]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: User = JSON.parse(saved);
        setUser(parsed);
        startRefreshTimer(parsed);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
    return clearRefreshTimer;
  }, [startRefreshTimer]);

  const login = useCallback((userData: User) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
    startRefreshTimer(userData);
  }, [startRefreshTimer]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch { /* ignora errores de red en logout */ }
    clearRefreshTimer();
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};
