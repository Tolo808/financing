/** Round-trips a value through JSON so Decimal instances become plain strings, safe for Prisma's Json columns. */
export function toJsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
