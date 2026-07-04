// Must run before anything constructs a Supabase client — React Native's JS engine doesn't
// fully implement the URL API that supabase-js relies on.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// AsyncStorage's web implementation touches `window`, which doesn't exist during Expo Router's
// server-side render pass (`expo start --web` / static web export) — swap in a no-op storage
// there so the client can even be constructed; the browser picks up the real AsyncStorage-backed
// session once it hydrates. Native builds never hit this (no SSR concept there).
const isServer = typeof window === 'undefined';
const noopStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

// Session persistence (AsyncStorage) means a signed-in driver stays signed in across app
// restarts without us managing a token ourselves, unlike the old custom-JWT approach.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isServer ? noopStorage : AsyncStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});
