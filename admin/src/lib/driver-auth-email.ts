import { normalizeEthiopianPhone } from "./phone";

// Supabase's Phone auth provider can't be enabled without configuring a real SMS provider
// (Twilio/etc.), even for password-only sign-in with pre-confirmed accounts — that conflicts
// with this project's explicit "no SMS" requirement. So drivers sign in with phone + PIN in the
// UI, but under the hood their Supabase Auth identity is this synthetic email derived from their
// phone number. The Expo app must compute the exact same value to sign in — keep in sync with
// MyApp/src/lib/driver-auth-email.ts.
//
// Normalizes via normalizeEthiopianPhone first (falling back to digits-only if that fails) so
// this produces the same email regardless of how the phone was typed (0911..., +251911...,
// +2510911... with a stray leading zero) — callers here are already validated E.164 by
// validation.ts, but this stays defensive since a mismatch here would silently lock a driver out.
export function driverAuthEmail(phone: string): string {
  const normalized = normalizeEthiopianPhone(phone) ?? phone;
  const digits = normalized.replace(/[^0-9]/g, "");
  return `driver-${digits}@drivers.tolo.internal`;
}
