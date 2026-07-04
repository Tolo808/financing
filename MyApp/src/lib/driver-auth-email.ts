import { normalizeEthiopianPhone } from './phone';

// Supabase's Phone auth provider can't be enabled without configuring a real SMS provider
// (Twilio/etc.), even for password-only sign-in with pre-confirmed accounts — that conflicts
// with this project's explicit "no SMS" requirement. So drivers sign in with phone + PIN in this
// screen, but under the hood their Supabase Auth identity is this synthetic email derived from
// their phone number. Must produce the exact same value as the admin backend — keep in sync with
// admin/src/lib/driver-auth-email.ts.
//
// Normalizes via normalizeEthiopianPhone first so a driver typing their number differently than
// the admin did (0911..., +251911..., +2510911... with a stray leading zero) still resolves to
// the same account instead of silently failing to log in.
export function driverAuthEmail(phone: string): string {
  const normalized = normalizeEthiopianPhone(phone) ?? phone;
  const digits = normalized.replace(/[^0-9]/g, '');
  return `driver-${digits}@drivers.tolo.internal`;
}
