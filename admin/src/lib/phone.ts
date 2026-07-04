// Ethiopian phone numbers are commonly typed several ways: local format with a leading 0
// (0911000001), E.164 (+251911000001), or — very commonly — the country code with the local
// leading 0 left in by habit (+2510911000001, not valid E.164). This normalizes all of those to
// canonical E.164 (+251 followed by exactly 9 digits, no leading 0) so Supabase's Admin API
// (which validates E.164 strictly) and the driver-facing synthetic auth email (driverAuthEmail)
// both get a consistent value regardless of how a phone number was originally typed.
// Keep in sync with MyApp/src/lib/phone.ts.
export function normalizeEthiopianPhone(raw: string): string | null {
  let digits = raw.replace(/[^0-9]/g, "");

  if (digits.startsWith("251")) {
    digits = digits.slice(3);
  }
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (!/^[79]\d{8}$/.test(digits)) {
    return null;
  }

  return `+251${digits}`;
}
