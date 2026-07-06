import Constants from 'expo-constants';
import { supabase } from './supabase';
import type { DashboardResponse } from '@/types/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Falls back to deriving the API host from the Metro dev server's LAN address, so a physical
// device running Expo Go can reach the admin backend on the same machine without manual config.
function resolveDefaultBaseUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:3000`;
  }
  return 'http://localhost:3000';
}

// EXPO_PUBLIC_API_BASE_URL is set only in the Netlify build environment (not in local .env), so
// local dev / Expo Go keeps using LAN auto-detection while the deployed web build points at the
// real admin API instead of the dev machine's localhost.
const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  resolveDefaultBaseUrl();

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) headers.Authorization = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && auth) {
    await supabase.auth.signOut();
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new ApiError(response.status, text || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

// The driver dashboard's computed stats (Tolo recovery %, MFI months-paid) stay behind our own
// API rather than being derived client-side, reusing the tested finance-aggregation logic
// (computeMfiSummary/getEffectiveConfig) instead of duplicating it in the app. Settlements and
// notifications, by contrast, are just rows — those go straight to Supabase (see
// use-settlements.ts / use-notifications.ts), governed by RLS.
export function fetchDashboard() {
  return apiRequest<DashboardResponse>('/api/driver/dashboard');
}
