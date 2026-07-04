// Ethiopian phone numbers are commonly typed several ways: local format with a leading 0
// (0911000001), E.164 (+251911000001), or the country code with the local leading 0 left in by
// habit (+2510911000001, not valid E.164). This normalizes all of those to canonical E.164 (+251
// followed by exactly 9 digits, no leading 0) so a driver's login always resolves to the same
// synthetic auth email (driverAuthEmail) the admin backend derived when creating the account,
// regardless of how the phone number was typed on either side.
// Keep in sync with admin/src/lib/phone.ts.
export function normalizeEthiopianPhone(raw: string): string | null {
  let digits = raw.replace(/[^0-9]/g, '');

  if (digits.startsWith('251')) {
    digits = digits.slice(3);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (!/^[79]\d{8}$/.test(digits)) {
    return null;
  }

  return `+251${digits}`;
}
