import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { driverAuthEmail } from './driver-auth-email';
import type { DriverProfile } from '@/types/api';

interface AuthContextValue {
  driver: DriverProfile | null;
  isLoading: boolean;
  login: (phone: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadDriverProfile(): Promise<DriverProfile | null> {
  // No explicit filter needed — the drivers_select_own RLS policy already scopes this to the
  // signed-in driver's own row (auth.uid() = authUserId).
  const { data, error } = await supabase
    .from('drivers')
    .select('id,name,phone,language,termMonths,cadence')
    .maybeSingle();
  if (error || !data) return null;
  return data as DriverProfile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;
      if (session) {
        setDriver(await loadDriverProfile());
      }
      setIsLoading(false);
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setDriver(null);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (phone: string, pin: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: driverAuthEmail(phone),
      password: pin,
    });
    if (error) throw error;

    const profile = await loadDriverProfile();
    if (!profile) {
      await supabase.auth.signOut();
      throw new Error('Driver account not found');
    }
    setDriver(profile);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setDriver(null);
  }, []);

  const value = useMemo(
    () => ({ driver, isLoading, login, logout }),
    [driver, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
