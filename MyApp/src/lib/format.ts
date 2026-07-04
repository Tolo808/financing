export function formatBirr(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  const rounded = Math.round(num);
  return `${rounded.toLocaleString('en-US')} Birr`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export function formatDateRange(startIso: string, endIso: string): string {
  return `${formatDate(startIso)} - ${formatDate(endIso)}`;
}
